use axum::{
    Json,
    extract::{Query, State},
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use crate::{
    auth_user::AuthUser,
    catalog::{self, LootEntry},
    errors::AppError,
    fair,
    seeds::{self, RotateResult, SeedStatus},
    state::AppState,
};

#[utoipa::path(
    get,
    path = "/fair/seeds",
    tag = "fair",
    responses(
        (status = 200, description = "Empreinte de la server seed active, client seed et prochain nonce", body = SeedStatus),
        (status = 401, description = "Non connecté"),
    )
)]
pub async fn get_seeds(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<Json<SeedStatus>, AppError> {
    Ok(Json(seeds::get_status(&state.pool, user_id).await?))
}

#[derive(Deserialize, ToSchema)]
pub struct ClientSeedRequest {
    pub client_seed: String,
}

#[utoipa::path(
    put,
    path = "/fair/client-seed",
    tag = "fair",
    request_body = ClientSeedRequest,
    responses(
        (status = 200, description = "Client seed mise à jour", body = SeedStatus),
        (status = 400, description = "Client seed invalide"),
        (status = 401, description = "Non connecté"),
    )
)]
pub async fn set_client_seed(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Json(req): Json<ClientSeedRequest>,
) -> Result<Json<SeedStatus>, AppError> {
    Ok(Json(
        seeds::set_client_seed(&state.pool, user_id, &req.client_seed).await?,
    ))
}

#[utoipa::path(
    post,
    path = "/fair/rotate",
    tag = "fair",
    responses(
        (status = 200, description = "Ancienne server seed révélée, nouvelle seed active", body = RotateResult),
        (status = 401, description = "Non connecté"),
    )
)]
pub async fn rotate(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<Json<RotateResult>, AppError> {
    Ok(Json(seeds::rotate(&state.pool, user_id).await?))
}

#[derive(Deserialize, IntoParams)]
pub struct VerifyQuery {
    /// Server seed révélée.
    pub server_seed: String,
    pub client_seed: String,
    pub nonce: i32,
    /// Slug de la caisse, pour obtenir l'objet correspondant au ticket.
    pub case: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct VerifyResponse {
    /// SHA-256 de la server seed : à comparer avec l'empreinte affichée avant l'ouverture.
    pub server_seed_hash: String,
    /// Ticket tiré, entre 0 et 99 999.
    pub ticket: u32,
    /// Objet correspondant dans la table de butin actuelle de la caisse.
    pub item: Option<LootEntry>,
}

#[utoipa::path(
    get,
    path = "/fair/verify",
    tag = "fair",
    params(VerifyQuery),
    responses(
        (status = 200, description = "Recalcul du tirage", body = VerifyResponse),
        (status = 400, description = "Nonce négatif"),
        (status = 404, description = "Caisse introuvable"),
    )
)]
pub async fn verify(
    State(state): State<AppState>,
    Query(q): Query<VerifyQuery>,
) -> Result<Json<VerifyResponse>, AppError> {
    if q.nonce < 0 {
        return Err(AppError::BadRequest("Le nonce doit être positif".into()));
    }
    let ticket = fair::roll(&q.server_seed, &q.client_seed, q.nonce);

    let item = match q.case.as_deref() {
        None => None,
        Some(slug) => {
            let case = catalog::find_case(&state.pool, slug)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("Caisse « {slug} » introuvable")))?;
            let table = catalog::loot_table(&state.pool, case.id).await?;
            fair::pick(&table, ticket).cloned()
        }
    };

    Ok(Json(VerifyResponse {
        server_seed_hash: fair::hash_server_seed(&q.server_seed),
        ticket,
        item,
    }))
}
