use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/{id}", get(get_user))
}

/// Profil public : ni email, ni solde, ni seed
#[derive(Serialize, ToSchema, sqlx::FromRow)]
pub struct PublicUser {
    pub id: Uuid,
    pub username: String,
    pub level: i32,
}

#[utoipa::path(
    get,
    path = "/users/{id}",
    tag = "users",
    params(("id" = Uuid, Path, description = "Identifiant de l'utilisateur")),
    responses(
        (status = 200, description = "Profil public", body = PublicUser),
        (status = 404, description = "Utilisateur introuvable", body = String, content_type = "text/plain"),
    )
)]
pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<PublicUser>, (StatusCode, String)> {
    let user: Option<PublicUser> =
        sqlx::query_as("SELECT id, username, level FROM users WHERE id = $1 AND banned_at IS NULL")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("{e}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Erreur interne".to_string(),
                )
            })?;

    user.map(Json)
        .ok_or((StatusCode::NOT_FOUND, "Utilisateur introuvable".to_string()))
}
