use axum::{
    Json,
    extract::{Path, State},
};

use crate::{
    auth_user::AuthUser,
    catalog::{self, CaseDetail, CaseSummary},
    errors::{AppError, ErrorBody},
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
        (status = 404, description = "Caisse introuvable ou indisponible", body = ErrorBody),
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
    security(("session" = [])),
    params(("slug" = String, Path, description = "Identifiant lisible de la caisse")),
    responses(
        (status = 200, description = "Caisse achetée et ouverte : objet gagné déjà dans l'inventaire", body = OpeningResult),
        (status = 401, description = "Non connecté", body = ErrorBody),
        (status = 402, description = "Solde insuffisant", body = ErrorBody),
        (status = 403, description = "Compte suspendu", body = ErrorBody),
        (status = 404, description = "Caisse introuvable ou indisponible", body = ErrorBody),
        (status = 409, description = "Caisse mal configurée (probabilités ≠ 100 %)", body = ErrorBody),
    )
)]
pub async fn open(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(slug): Path<String>,
) -> Result<Json<OpeningResult>, AppError> {
    Ok(Json(opening::open_case(&state.pool, user_id, &slug).await?))
}
