use axum::{
    Json,
    extract::{Path, State},
};

use crate::{
    catalog::{self, CaseDetail, CaseSummary},
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

#[utoipa::path(
    get,
    path = "/cases/{slug}",
    tag = "cases",
    params(("slug" = String, Path, description = "Identifiant lisible de la caisse")),
    responses(
        (status = 200, description = "Fiche de la caisse avec les probabilités de chaque objet", body = CaseDetail),
        (status = 404, description = "Caisse introuvable ou indisponible"),
    )
)]
pub async fn detail(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<CaseDetail>, AppError> {
    catalog::case_detail(&state.pool, &slug)
        .await?
        .map(Json)
        .ok_or_else(|| AppError::NotFound(format!("Caisse « {slug} » introuvable")))
}
