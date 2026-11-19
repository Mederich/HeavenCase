use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    auth_user::AuthUser,
    errors::AppError,
    state::AppState,
    wallet::{self, TransactionPage},
};

#[derive(Deserialize, IntoParams)]
pub struct TransactionsQuery {
    /// Page, à partir de 1 (1 par défaut).
    pub page: Option<i64>,
    /// Lignes par page (1 à 100, 20 par défaut).
    pub per_page: Option<i64>,
}

#[utoipa::path(
    get,
    path = "/transactions",
    tag = "wallet",
    params(TransactionsQuery),
    responses(
        (status = 200, description = "Mouvements de crédits du joueur, du plus récent au plus ancien", body = TransactionPage),
        (status = 400, description = "Page ou taille de page invalide"),
        (status = 401, description = "Non connecté"),
    )
)]
pub async fn list(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Query(q): Query<TransactionsQuery>,
) -> Result<Json<TransactionPage>, AppError> {
    let page = q.page.unwrap_or(1);
    let per_page = q.per_page.unwrap_or(20);
    if page < 1 {
        return Err(AppError::BadRequest("La page commence à 1".into()));
    }
    if !(1..=wallet::MAX_PER_PAGE).contains(&per_page) {
        return Err(AppError::BadRequest(format!(
            "per_page doit être entre 1 et {}",
            wallet::MAX_PER_PAGE
        )));
    }
    Ok(Json(
        wallet::list(&state.pool, user_id, page, per_page).await?,
    ))
}
