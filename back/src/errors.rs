use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

pub enum AppError {
    NotFound(String),
    /// Erreur inattendue : le détail est loggé, le client reçoit un message générique.
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m),
            AppError::Internal(detail) => {
                tracing::error!("{detail}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Erreur interne".to_string(),
                )
            }
        };
        (status, Json(json!({ "error": msg }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Internal(e.to_string())
    }
}
