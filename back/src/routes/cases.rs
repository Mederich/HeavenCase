use axum::{Json, extract::State};

use crate::{
    catalog::{self, CaseSummary},
    errors::AppError,
    state::AppState,
};

#[utoipa::path(
    get,
    path = "/cases",
    tag = "cases",
    responses((status = 200, description = "Caisses disponibles, triées par prix", body = Vec<CaseSummary>))
)]
pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<CaseSummary>>, AppError> {
    Ok(Json(catalog::list_cases(&state.pool).await?))
}
