use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    auth_user::AuthUser,
    errors::{AppError, ErrorBody},
    opening::{self, OpeningHistoryEntry},
    state::AppState,
};

#[derive(Deserialize, IntoParams)]
pub struct HistoryQuery {
    /// Nombre d'ouvertures à renvoyer (1 à 100, 20 par défaut).
    pub limit: Option<i64>,
}

#[utoipa::path(
    get,
    path = "/openings",
    tag = "fair",
    security(("session" = [])),
    params(HistoryQuery),
    responses(
        (status = 200, description = "Dernières ouvertures du joueur, avec la server seed une fois révélée", body = Vec<OpeningHistoryEntry>),
        (status = 401, description = "Non connecté", body = ErrorBody),
    )
)]
pub async fn history(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Query(q): Query<HistoryQuery>,
) -> Result<Json<Vec<OpeningHistoryEntry>>, AppError> {
    let limit = q.limit.unwrap_or(20);
    Ok(Json(opening::history(&state.pool, user_id, limit).await?))
}
