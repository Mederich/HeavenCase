use axum::{
    Json,
    extract::{Path, Query, State},
};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::{
    auth_user::AuthUser,
    catalog::{self, CaseDetail, CaseSummary, PriceRange},
    errors::AppError,
    opening::{self, OpeningResult},
    state::AppState,
};

#[derive(Debug, Default, Deserialize, IntoParams)]
pub struct ListQuery {
    /// Prix minimum en crédits (inclus).
    pub min_price: Option<i64>,
    /// Prix maximum en crédits (inclus).
    pub max_price: Option<i64>,
}

impl ListQuery {
    fn price_range(&self) -> Result<PriceRange, AppError> {
        if self.min_price.is_some_and(|p| p < 0) || self.max_price.is_some_and(|p| p < 0) {
            return Err(AppError::BadRequest(
                "Les prix doivent être positifs".into(),
            ));
        }
        if let (Some(min), Some(max)) = (self.min_price, self.max_price)
            && min > max
        {
            return Err(AppError::BadRequest(
                "Le prix minimum doit être inférieur ou égal au prix maximum".into(),
            ));
        }
        Ok(PriceRange {
            min: self.min_price,
            max: self.max_price,
        })
    }
}

#[utoipa::path(
    get,
    path = "/cases",
    tag = "cases",
    params(ListQuery),
    responses(
        (status = 200, description = "Caisses disponibles dans la plage de prix, triées par section puis par prix", body = Vec<CaseSummary>),
        (status = 400, description = "Prix négatif ou minimum supérieur au maximum"),
    )
)]
pub async fn list(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> Result<Json<Vec<CaseSummary>>, AppError> {
    let range = q.price_range()?;
    Ok(Json(catalog::list_cases(&state.pool, range).await?))
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

#[cfg(test)]
mod tests {
    use super::*;

    fn query(min: Option<i64>, max: Option<i64>) -> ListQuery {
        ListQuery {
            min_price: min,
            max_price: max,
        }
    }

    #[test]
    fn accepte_une_plage_valide_ou_vide() {
        assert!(query(None, None).price_range().is_ok());
        assert!(query(Some(100), Some(100)).price_range().is_ok());
        assert!(query(Some(0), None).price_range().is_ok());
    }

    #[test]
    fn refuse_un_prix_negatif() {
        assert!(matches!(
            query(Some(-1), None).price_range(),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            query(None, Some(-5)).price_range(),
            Err(AppError::BadRequest(_))
        ));
    }

    #[test]
    fn refuse_un_minimum_superieur_au_maximum() {
        assert!(matches!(
            query(Some(500), Some(100)).price_range(),
            Err(AppError::BadRequest(_))
        ));
    }
}
