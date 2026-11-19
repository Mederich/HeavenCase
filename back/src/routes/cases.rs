use axum::{
    Json,
    extract::{Path, State},
};

use crate::{
    auth_user::AuthUser,
    catalog::{self, CaseDetail, CaseSummary},
    errors::AppError,
    opening::{self, OpeningResult},
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

#[utoipa::path(
    post,
    path = "/cases/{slug}/open",
    tag = "cases",
    params(("slug" = String, Path, description = "Identifiant lisible de la caisse")),
    responses(
        (status = 200, description = "Caisse achetée et ouverte : objet gagné déjà dans l'inventaire", body = OpeningResult),
        (status = 401, description = "Non connecté"),
        (status = 402, description = "Solde insuffisant"),
        (status = 403, description = "Compte suspendu"),
        (status = 404, description = "Caisse introuvable ou indisponible"),
        (status = 409, description = "Caisse mal configurée (probabilités ≠ 100 %)"),
    )
)]
pub async fn open(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(slug): Path<String>,
) -> Result<Json<OpeningResult>, AppError> {
    Ok(Json(opening::open_case(&state.pool, user_id, &slug).await?))
}
