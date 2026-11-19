use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    auth_user::AuthUser,
    errors::AppError,
    inventory::{self, InventoryEntry, StatusFilter},
    state::AppState,
};

#[derive(Deserialize, IntoParams)]
pub struct InventoryQuery {
    /// owned (par défaut), sold ou all.
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    path = "/inventory",
    tag = "inventory",
    params(InventoryQuery),
    responses(
        (status = 200, description = "Skins du joueur, du plus récent au plus ancien", body = Vec<InventoryEntry>),
        (status = 400, description = "Statut inconnu"),
        (status = 401, description = "Non connecté"),
    )
)]
pub async fn list(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Query(q): Query<InventoryQuery>,
) -> Result<Json<Vec<InventoryEntry>>, AppError> {
    let status = StatusFilter::parse(q.status.as_deref()).ok_or_else(|| {
        AppError::BadRequest("Statut inconnu : owned, sold ou all attendu".into())
    })?;
    Ok(Json(inventory::list(&state.pool, user_id, status).await?))
}
