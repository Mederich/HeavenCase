use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use utoipa::ToSchema;

/// Corps des réponses d'erreur JSON.
#[derive(Serialize, ToSchema)]
pub struct ErrorBody {
    /// Message lisible par le joueur.
    pub error: String,
}

#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    Unauthorized(String),
    /// Solde insuffisant pour l'achat demandé.
    PaymentRequired(String),
    Forbidden(String),
    NotFound(String),
    Conflict(String),
    /// Erreur inattendue : le détail est loggé, le client reçoit un message générique.
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            AppError::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m),
            AppError::PaymentRequired(m) => (StatusCode::PAYMENT_REQUIRED, m),
            AppError::Forbidden(m) => (StatusCode::FORBIDDEN, m),
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m),
            AppError::Conflict(m) => (StatusCode::CONFLICT, m),
            AppError::Internal(detail) => {
                tracing::error!("{detail}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Erreur interne".to_string(),
                )
            }
        };
        (status, Json(ErrorBody { error: msg })).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Internal(e.to_string())
    }
}
