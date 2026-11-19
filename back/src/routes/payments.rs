use axum::{
    Json,
    body::Bytes,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    auth_user::AuthUser,
    errors::AppError,
    payments::{self, CheckoutStarted, PACKS, Pack, Payment, StripeConfig},
    state::AppState,
};

fn stripe(state: &AppState) -> Result<&StripeConfig, AppError> {
    state.stripe.as_ref().ok_or_else(|| {
        AppError::Conflict("Le dépôt par carte n'est pas configuré sur ce serveur".into())
    })
}

#[utoipa::path(
    get,
    path = "/payments/packs",
    tag = "wallet",
    responses((status = 200, description = "Packs de crédits proposés", body = Vec<Pack>))
)]
pub async fn packs() -> Json<Vec<Pack>> {
    Json(PACKS.to_vec())
}

#[derive(Deserialize, ToSchema)]
pub struct CheckoutRequest {
    /// Identifiant du pack : 10, 20, 50 ou 100 (euros).
    pub pack: String,
}

#[utoipa::path(
    post,
    path = "/payments/checkout",
    tag = "wallet",
    request_body = CheckoutRequest,
    responses(
        (status = 200, description = "Paiement en attente créé, rediriger vers checkout_url", body = CheckoutStarted),
        (status = 400, description = "Pack inconnu"),
        (status = 401, description = "Non connecté"),
        (status = 403, description = "Compte non activé (âge ou CGU)"),
        (status = 409, description = "Dépôt non configuré"),
    )
)]
pub async fn checkout(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Json(req): Json<CheckoutRequest>,
) -> Result<Json<CheckoutStarted>, AppError> {
    let stripe = stripe(&state)?;
    Ok(Json(
        payments::start_checkout(
            &state.pool,
            &state.http,
            stripe,
            &state.app_url,
            user_id,
            &req.pack,
        )
        .await?,
    ))
}

#[utoipa::path(
    get,
    path = "/payments/{id}",
    tag = "wallet",
    params(("id" = Uuid, Path, description = "Id du paiement")),
    responses(
        (status = 200, description = "État du paiement du joueur", body = Payment),
        (status = 401, description = "Non connecté"),
        (status = 404, description = "Paiement introuvable"),
    )
)]
pub async fn get(
    State(state): State<AppState>,
    AuthUser(user_id): AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Payment>, AppError> {
    Ok(Json(payments::get(&state.pool, user_id, id).await?))
}

#[utoipa::path(
    post,
    path = "/payments/webhook",
    tag = "wallet",
    request_body(content = String, description = "Événement Stripe brut, signé (en-tête Stripe-Signature)", content_type = "application/json"),
    responses(
        (status = 200, description = "Événement traité (ou déjà traité)"),
        (status = 400, description = "Signature ou corps invalide"),
    )
)]
pub async fn webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    let stripe = stripe(&state)?;
    let signature = headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or_default();
    if !payments::verify_signature(&body, signature, &stripe.webhook_secret, now) {
        tracing::warn!("webhook Stripe refusé : signature invalide");
        return Err(AppError::BadRequest("Signature invalide".into()));
    }
    let event: serde_json::Value = serde_json::from_slice(&body)
        .map_err(|_| AppError::BadRequest("Corps illisible".into()))?;
    payments::handle_event(&state.pool, &event).await?;
    Ok(StatusCode::OK)
}
