//! Extracteur du joueur connecté, à partir de la session posée par `/auth/login`.

use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use tower_sessions::Session;
use uuid::Uuid;

use crate::errors::AppError;

/// Id du joueur connecté. Un handler qui le prend en argument répond 401 si
/// la requête n'a pas de session valide.
pub struct AuthUser(pub Uuid);

impl<S: Send + Sync> FromRequestParts<S> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let session = Session::from_request_parts(parts, state)
            .await
            .map_err(|(_, msg)| AppError::Internal(msg.to_string()))?;
        let user_id: Option<Uuid> = session
            .get("user_id")
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        user_id
            .map(AuthUser)
            .ok_or_else(|| AppError::Unauthorized("Connecte-toi pour continuer".into()))
    }
}

/// Vérifie que le joueur connecté possède le rôle administrateur.
pub struct AdminUser;

impl<S: Send + Sync> FromRequestParts<S> for AdminUser
where
    crate::state::AppState: axum::extract::FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let AuthUser(user_id) = AuthUser::from_request_parts(parts, state).await?;

        let app_state = crate::state::AppState::from_ref(state);

        let role: Option<String> =
            sqlx::query_scalar("SELECT role::text FROM users WHERE id = $1 AND banned_at IS NULL")
                .bind(user_id)
                .fetch_optional(&app_state.pool)
                .await?;

        match role.as_deref() {
            Some("admin") => Ok(AdminUser),
            Some(_) => Err(AppError::Forbidden(
                "Accès réservé aux administrateurs".into(),
            )),
            None => Err(AppError::Unauthorized(
                "Compte introuvable ou suspendu".into(),
            )),
        }
    }
}
