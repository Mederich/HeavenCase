//! Extracteur du joueur connecté, à partir de la session posée par `/auth/login`.

use axum::{extract::FromRequestParts, http::request::Parts};
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
