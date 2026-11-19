use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tower_sessions::Session;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::state::AppState;

type ApiError = (StatusCode, String);

fn internal<E: std::fmt::Display>(e: E) -> ApiError {
    tracing::error!("{e}");
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Erreur interne".to_string(),
    )
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    password_auth::verify_password(password, hash).is_ok()
}


#[derive(Deserialize, ToSchema)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct RegisterResponse {
    pub id: Uuid,
    pub message: String,
}

#[utoipa::path(
    post,
    path = "/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Compte créé, mail de validation envoyé", body = RegisterResponse),
        (status = 400, description = "Données invalides"),
        (status = 409, description = "Email déjà utilisé"),
    )
)]
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<RegisterResponse>), ApiError> {
    let username = req.username.trim().to_string();
    let email = req.email.trim().to_lowercase();

    if username.is_empty() || !email.contains('@') || req.password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Pseudo requis, email valide et mot de passe de 8 caractères minimum".into(),
        ));
    }

    // Argon2 est volontairement lent : on le sort du thread async
    let password = req.password;
    let password_hash =
        tokio::task::spawn_blocking(move || password_auth::generate_hash(&password))
            .await
            .map_err(internal)?;

    // Utilisateur + jeton dans une transaction : tout passe ou rien
    let mut tx = state.pool.begin().await.map_err(internal)?;

    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(&username)
    .bind(&email)
    .bind(&password_hash)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        let duplicate = e
            .as_database_error()
            .is_some_and(|d| d.is_unique_violation());
        if duplicate {
            (
                StatusCode::CONFLICT,
                "Cet email est déjà utilisé".to_string(),
            )
        } else {
            internal(e)
        }
    })?;

    // Jeton aléatoire envoyé par mail, seul son hash est stocké
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    let token = hex::encode(bytes);
    let token_hash = hex::encode(Sha256::digest(token.as_bytes()));

    sqlx::query(
        "INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + interval '24 hours')",
    )
    .bind(&token_hash)
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(internal)?;

    tx.commit().await.map_err(internal)?;

    let link = format!("{}/auth/verify?token={}", state.app_url, token);
    let body = format!(
        "Bienvenue {username} !\n\nClique sur ce lien pour valider ton compte (valable 24 h) :\n{link}"
    );
    if let Err(e) = state
        .mailer
        .send(&email, "Valide ton compte heavenCase", body)
        .await
    {
        tracing::error!("Échec d'envoi du mail de validation : {e}");
    }

    Ok((
        StatusCode::CREATED,
        Json(RegisterResponse {
            id: user_id,
            message: "Compte créé, vérifie tes mails".into(),
        }),
    ))
}

// ---------- Validation du mail ----------

#[derive(Deserialize, IntoParams)]
pub struct VerifyQuery {
    pub token: String,
}

#[utoipa::path(
    get,
    path = "/auth/verify",
    tag = "auth",
    params(VerifyQuery),
    responses(
        (status = 200, description = "Compte validé"),
        (status = 400, description = "Lien invalide ou expiré"),
    )
)]
pub async fn verify_email(
    State(state): State<AppState>,
    Query(q): Query<VerifyQuery>,
) -> Result<&'static str, ApiError> {
    let token_hash = hex::encode(Sha256::digest(q.token.as_bytes()));

    let mut tx = state.pool.begin().await.map_err(internal)?;

    let user_id: Option<Uuid> = sqlx::query_scalar(
        "DELETE FROM email_verification_tokens
         WHERE token_hash = $1 AND expires_at > now()
         RETURNING user_id",
    )
    .bind(&token_hash)
    .fetch_optional(&mut *tx)
    .await
    .map_err(internal)?;

    let Some(user_id) = user_id else {
        return Err((StatusCode::BAD_REQUEST, "Lien invalide ou expiré".into()));
    };

    sqlx::query(
        "UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await
    .map_err(internal)?;

    tx.commit().await.map_err(internal)?;

    Ok("Compte validé, tu peux te connecter")
}

// ---------- Connexion ----------

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct LoginResponse {
    pub id: Uuid,
    pub username: String,
}

#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Connecté, cookie de session posé", body = LoginResponse),
        (status = 401, description = "Identifiants incorrects"),
        (status = 403, description = "Email non validé ou compte suspendu"),
    )
)]
pub async fn login(
    State(state): State<AppState>,
    session: Session,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, ApiError> {
    let email = req.email.trim().to_lowercase();
    let bad_credentials = || {
        (
            StatusCode::UNAUTHORIZED,
            "Email ou mot de passe incorrect".to_string(),
        )
    };

    let user: Option<(Uuid, String, Option<String>, bool, bool)> = sqlx::query_as(
        "SELECT id, username, password_hash,
                email_verified_at IS NOT NULL,
                banned_at IS NOT NULL
         FROM users WHERE lower(email) = $1",
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;

    let Some((user_id, username, password_hash, verified, banned)) = user else {
        return Err(bad_credentials());
    };
    let Some(password_hash) = password_hash else {
        return Err(bad_credentials());
    };

    let password = req.password;
    let ok = tokio::task::spawn_blocking(move || verify_password(&password, &password_hash))
        .await
        .map_err(internal)?;

    if !ok {
        return Err(bad_credentials());
    }
    if !verified {
        return Err((
            StatusCode::FORBIDDEN,
            "Valide ton email avant de te connecter".into(),
        ));
    }
    if banned {
        return Err((StatusCode::FORBIDDEN, "Compte suspendu".into()));
    }


    session.cycle_id().await.map_err(internal)?;
    session.insert("user_id", user_id).await.map_err(internal)?;

    Ok(Json(LoginResponse {
        id: user_id,
        username,
    }))
}


fn new_token() -> (String, String) {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    let token = hex::encode(bytes);
    let hash = hex::encode(Sha256::digest(token.as_bytes()));
    (token, hash)
}


#[derive(Deserialize, ToSchema)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[utoipa::path(
    post,
    path = "/auth/forgot-password",
    tag = "auth",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "Réponse identique que le compte existe ou non"),
    )
)]
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(req): Json<ForgotPasswordRequest>,
) -> Result<&'static str, ApiError> {
    const MESSAGE: &str =
        "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé";

    let email = req.email.trim().to_lowercase();

    let user: Option<(Uuid, String)> = sqlx::query_as(
        "SELECT id, username FROM users
         WHERE lower(email) = $1 AND password_hash IS NOT NULL AND banned_at IS NULL",
    )
        .bind(&email)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?;

    let Some((user_id, username)) = user else {
        return Ok(MESSAGE);
    };

    let (token, token_hash) = new_token();

    let mut tx = state.pool.begin().await.map_err(internal)?;

    sqlx::query("DELETE FROM password_reset_tokens WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(internal)?;

    sqlx::query(
        "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')",
    )
        .bind(&token_hash)
        .bind(user_id)
        .execute(&mut *tx)
        .await
        .map_err(internal)?;

    tx.commit().await.map_err(internal)?;

    let link = format!("{}/reset-password?token={}", state.app_url, token);
    let body = format!(
        "Bonjour {username},\n\nPour choisir un nouveau mot de passe, clique sur ce lien (valable 1 h) :\n{link}\n\nSi tu n'es pas à l'origine de cette demande, ignore ce mail."
    );

    let mailer = state.mailer.clone();
    tokio::spawn(async move {
        if let Err(e) = mailer
            .send(&email, "Réinitialisation de ton mot de passe heavenCase", body)
            .await
        {
            tracing::error!("Échec d'envoi du mail de réinitialisation : {e}");
        }
    });

    Ok(MESSAGE)
}

#[derive(Deserialize, ToSchema)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[utoipa::path(
    post,
    path = "/auth/reset-password",
    tag = "auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Mot de passe modifié"),
        (status = 400, description = "Lien invalide ou expiré, ou mot de passe trop court"),
    )
)]
pub async fn reset_password(
    State(state): State<AppState>,
    Json(req): Json<ResetPasswordRequest>,
) -> Result<&'static str, ApiError> {
    if req.new_password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Le mot de passe doit faire 8 caractères minimum".into(),
        ));
    }

    let token_hash = hex::encode(Sha256::digest(req.token.as_bytes()));

    let password = req.new_password;
    let password_hash =
        tokio::task::spawn_blocking(move || password_auth::generate_hash(&password))
            .await
            .map_err(internal)?;

    let mut tx = state.pool.begin().await.map_err(internal)?;


    let user_id: Option<Uuid> = sqlx::query_scalar(
        "DELETE FROM password_reset_tokens
         WHERE token_hash = $1 AND expires_at > now()
         RETURNING user_id",
    )
        .bind(&token_hash)
        .fetch_optional(&mut *tx)
        .await
        .map_err(internal)?;

    let Some(user_id) = user_id else {
        return Err((StatusCode::BAD_REQUEST, "Lien invalide ou expiré".into()));
    };

    let (username, email): (String, String) = sqlx::query_as(
        "UPDATE users
         SET password_hash = $1,
             email_verified_at = COALESCE(email_verified_at, now())
         WHERE id = $2
         RETURNING username, email",
    )
        .bind(&password_hash)
        .bind(user_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(internal)?;

    tx.commit().await.map_err(internal)?;

    let body = format!(
        "Bonjour {username},\n\nTon mot de passe heavenCase vient d'être modifié.\n\nSi tu n'es pas à l'origine de ce changement, contacte-nous immédiatement."
    );
    let mailer = state.mailer.clone();
    tokio::spawn(async move {
        if let Err(e) = mailer
            .send(&email, "Ton mot de passe heavenCase a été modifié", body)
            .await
        {
            tracing::error!("Échec d'envoi du mail de confirmation : {e}");
        }
    });

    Ok("Mot de passe modifié, tu peux te connecter")
}
