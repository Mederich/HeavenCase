//! Profil privé du joueur connecté : consultation (HENC-37) et modification
//! du pseudonyme (HENC-39). Toujours lu et écrit pour l'id de la session,
//! jamais pour un id reçu dans la requête.

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::errors::AppError;

pub const USERNAME_MIN: usize = 3;
pub const USERNAME_MAX: usize = 32;

/// Profil privé : ni mot de passe, ni hash, ni secret de session.
#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct Account {
    pub id: Uuid,
    pub username: String,
    pub email: Option<String>,
    /// Modes de connexion du compte : `email` (mot de passe) et/ou `steam`.
    pub auth_methods: Vec<String>,
    /// Date de création, ISO 8601 (UTC).
    pub created_at: String,
}

pub async fn get(pool: &PgPool, user_id: Uuid) -> Result<Account, AppError> {
    sqlx::query_as(
        "SELECT id, username, email,
                array_remove(ARRAY[
                    CASE WHEN password_hash IS NOT NULL THEN 'email' END,
                    CASE WHEN steam_id IS NOT NULL THEN 'steam' END
                ], NULL) AS auth_methods,
                to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at
         FROM users
         WHERE id = $1 AND banned_at IS NULL",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Compte introuvable".into()))
}

/// Pseudonyme : 3 à 32 caractères, lettres, chiffres, espaces, `_`, `-` et `.`.
pub fn validate_username(raw: &str) -> Result<String, AppError> {
    let username = raw.trim();
    let length = username.chars().count();
    if length == 0 {
        return Err(AppError::BadRequest("Le pseudo est obligatoire".into()));
    }
    if !(USERNAME_MIN..=USERNAME_MAX).contains(&length) {
        return Err(AppError::BadRequest(format!(
            "Le pseudo doit faire entre {USERNAME_MIN} et {USERNAME_MAX} caractères"
        )));
    }
    let allowed = |c: char| c.is_alphanumeric() || matches!(c, ' ' | '_' | '-' | '.');
    if !username.chars().all(allowed) {
        return Err(AppError::BadRequest(
            "Le pseudo ne peut contenir que des lettres, des chiffres, des espaces, « _ », « - » et « . »"
                .into(),
        ));
    }
    if username.contains("  ") {
        return Err(AppError::BadRequest(
            "Le pseudo ne peut pas contenir deux espaces à la suite".into(),
        ));
    }
    Ok(username.to_string())
}

/// Change le pseudonyme du joueur connecté ; ne touche ni au mot de passe ni aux connexions.
pub async fn update_username(pool: &PgPool, user_id: Uuid, raw: &str) -> Result<Account, AppError> {
    let username = validate_username(raw)?;
    let updated = sqlx::query("UPDATE users SET username = $2 WHERE id = $1 AND banned_at IS NULL")
        .bind(user_id)
        .bind(&username)
        .execute(pool)
        .await?;
    if updated.rows_affected() == 0 {
        return Err(AppError::Unauthorized("Compte introuvable".into()));
    }
    get(pool, user_id).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::create_user;

    #[test]
    fn valide_le_pseudo() {
        assert_eq!(validate_username("  Zeus_42 ").unwrap(), "Zeus_42");
        assert!(validate_username("Éole.du-Nord").is_ok());
        assert!(matches!(
            validate_username("   "),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            validate_username("ab"),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            validate_username(&"a".repeat(33)),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            validate_username("moi@mail.com"),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            validate_username("<script>"),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            validate_username("deux  espaces"),
            Err(AppError::BadRequest(_))
        ));
    }

    #[sqlx::test]
    async fn renvoie_le_profil_sans_secret(pool: PgPool) {
        let user = create_user(&pool, 0).await;
        let account = get(&pool, user).await.unwrap();
        assert_eq!(account.id, user);
        assert_eq!(account.auth_methods, ["email"]);
        assert!(account.email.is_some());
        let json = serde_json::to_string(&account).unwrap();
        assert!(!json.contains("hash"), "{json}");
    }

    #[sqlx::test]
    async fn modifie_seulement_son_propre_pseudo(pool: PgPool) {
        let me = create_user(&pool, 0).await;
        let other = create_user(&pool, 0).await;
        let before_other = get(&pool, other).await.unwrap().username;

        let account = update_username(&pool, me, "  Nouveau Pseudo ")
            .await
            .unwrap();
        assert_eq!(account.username, "Nouveau Pseudo");
        assert_eq!(get(&pool, me).await.unwrap().username, "Nouveau Pseudo");
        assert_eq!(get(&pool, other).await.unwrap().username, before_other);

        let hash: String = sqlx::query_scalar("SELECT password_hash FROM users WHERE id = $1")
            .bind(me)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(hash, "hash-de-test");
    }

    #[sqlx::test]
    async fn pseudo_invalide_ne_change_rien(pool: PgPool) {
        let me = create_user(&pool, 0).await;
        let before = get(&pool, me).await.unwrap().username;
        assert!(update_username(&pool, me, "x").await.is_err());
        assert_eq!(get(&pool, me).await.unwrap().username, before);
    }
}
