use axum::{Json, extract::State};
use serde::Deserialize;
use utoipa::ToSchema;

use crate::{
    account::{self, Account},
    auth_user::AuthUser,
    errors::AppError,
    state::AppState,
};

#[utoipa::path(
    get,
    path = "/account",
    tag = "account",
    responses(
        (status = 200, description = "Profil privé du joueur connecté", body = Account),
        (status = 401, description = "Non connecté"),
    )
)]
pub async fn get(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
) -> Result<Json<Account>, AppError> {
    Ok(Json(account::get(&state.pool, user_id).await?))
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateAccountRequest {
    /// Nouveau pseudo : 3 à 32 caractères, lettres, chiffres, espaces, `_`, `-` et `.`.
    pub username: String,
}

#[utoipa::path(
    patch,
    path = "/account",
    tag = "account",
    request_body = UpdateAccountRequest,
    responses(
        (status = 200, description = "Profil mis à jour", body = Account),
        (status = 400, description = "Pseudo invalide"),
        (status = 401, description = "Non connecté"),
    )
)]
pub async fn update(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Json(req): Json<UpdateAccountRequest>,
) -> Result<Json<Account>, AppError> {
    Ok(Json(
        account::update_username(&state.pool, user_id, &req.username).await?,
    ))
}
