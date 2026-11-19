use axum::{
    Json,
    extract::{Path, Query, State},
};
use serde::Deserialize;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::{
    auth_user::AuthUser,
    errors::AppError,
    inventory::{self, InventoryEntry, SaleResult, StatusFilter},
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

#[utoipa::path(
    post,
    path = "/inventory/{id}/sell",
    tag = "inventory",
    params(("id" = Uuid, Path, description = "Id de la ligne d'inventaire")),
    responses(
        (status = 200, description = "Skin vendu, solde crédité", body = SaleResult),
        (status = 401, description = "Non connecté"),
        (status = 403, description = "Compte suspendu"),
        (status = 404, description = "Objet absent de l'inventaire du joueur"),
        (status = 409, description = "Objet déjà vendu"),
    )
)]
pub async fn sell(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<SaleResult>, AppError> {
    Ok(Json(inventory::sell(&state.pool, user_id, id).await?))
}
