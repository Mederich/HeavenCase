mod account;
mod auth;
mod cases;
mod fair;
mod inventory;
mod openings;
mod payments;
mod transactions;
mod users;

use crate::state::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post, put};
use axum::{Json, Router};
use utoipa::openapi::security::{ApiKey, ApiKeyValue, SecurityScheme};
use utoipa::{Modify, OpenApi};
use utoipa_swagger_ui::SwaggerUi;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "HeavenCases API",
        description = "API du site d'ouverture de caisses CS2. Les routes marquées d'un cadenas demandent le cookie de session `id` posé par `POST /auth/login`. Les erreurs de `/auth` et `/users` sont en texte brut, les autres en JSON (`ErrorBody`)."
    ),
    servers((url = "/", description = "Back en direct"), (url = "/api", description = "Via le proxy du front")),
    modifiers(&SessionCookie),
    components(schemas(crate::errors::ErrorBody)),
    paths(
        health,
        db_health,
        auth::register,
        auth::verify_email,
        auth::login,
        auth::me,
        auth::logout,
        auth::forgot_password,
        auth::reset_password,
        auth::complete_account,
        auth::terms,
        users::get_user,
        account::get,
        account::update,
        cases::list,
        cases::detail,
        cases::open,
        fair::get_seeds,
        fair::set_client_seed,
        fair::rotate,
        fair::verify,
        openings::history,
        inventory::list,
        inventory::sell,
        transactions::list,
        payments::packs,
        payments::checkout,
        payments::get,
        payments::webhook,
    ),
    tags(
        (name = "health", description = "État du service"),
        (name = "auth", description = "Inscription et connexion"),
        (name = "users", description = "Profils des joueurs"),
        (name = "account", description = "Profil privé du joueur connecté"),
        (name = "cases", description = "Catalogue de caisses"),
        (name = "fair", description = "Preuve d'équité (provably fair)"),
        (name = "inventory", description = "Inventaire du joueur"),
        (name = "wallet", description = "Solde, dépôts et historique des crédits")
    )
)]
pub struct ApiDoc;

/// Déclare l'authentification par cookie de session (tower-sessions).
struct SessionCookie;

impl Modify for SessionCookie {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_with(Default::default);
        components.add_security_scheme(
            "session",
            SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::with_description(
                "id",
                "Cookie de session posé par POST /auth/login",
            ))),
        );
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/health/db", get(db_health))
        .nest("/users", users::router())
        .route("/account", get(account::get).patch(account::update))
        .route("/auth/register", post(auth::register))
        .route("/auth/verify", get(auth::verify_email))
        .route("/auth/login", post(auth::login))
        .route("/auth/me", get(auth::me))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/forgot-password", post(auth::forgot_password))
        .route("/auth/reset-password", post(auth::reset_password))
        .route("/auth/complete", post(auth::complete_account))
        .route("/terms", get(auth::terms))
        .route("/cases", get(cases::list))
        .route("/cases/{slug}", get(cases::detail))
        .route("/cases/{slug}/open", post(cases::open))
        .route("/fair/seeds", get(fair::get_seeds))
        .route("/fair/client-seed", put(fair::set_client_seed))
        .route("/fair/rotate", post(fair::rotate))
        .route("/fair/verify", get(fair::verify))
        .route("/openings", get(openings::history))
        .route("/inventory", get(inventory::list))
        .route("/inventory/{id}/sell", post(inventory::sell))
        .route("/transactions", get(transactions::list))
        .route("/payments/packs", get(payments::packs))
        .route("/payments/checkout", post(payments::checkout))
        .route("/payments/webhook", post(payments::webhook))
        .route("/payments/{id}", get(payments::get))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
}

#[utoipa::path(
    get,
    path = "/health",
    tag = "health",
    responses((status = 200, description = "Service démarré", body = String, content_type = "text/plain"))
)]
async fn health() -> &'static str {
    "ok"
}

#[utoipa::path(
    get,
    path = "/health/db",
    tag = "health",
    responses((status = 200, description = "Tables présentes en base", body = Vec<String>))
)]
async fn db_health(
    State(state): State<AppState>,
) -> Result<Json<Vec<String>>, (StatusCode, String)> {
    let tables: Vec<String> = sqlx::query_scalar(
        "SELECT table_name::text FROM information_schema.tables
         WHERE table_schema = 'public' ORDER BY table_name",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(tables))
}

#[cfg(test)]
mod tests {
    use super::ApiDoc;
    use utoipa::OpenApi;

    /// Vérifie la spec et l'écrit dans `$OPENAPI_OUT` si la variable est définie (export CI).
    #[test]
    fn openapi_spec() {
        let spec = ApiDoc::openapi();
        let json = spec.to_pretty_json().expect("spec sérialisable");

        for (path, item) in &spec.paths.paths {
            assert!(path.starts_with('/'), "chemin invalide : {path}");
            let ops = [&item.get, &item.post, &item.put, &item.delete, &item.patch];
            for op in ops.into_iter().flatten() {
                assert!(
                    op.tags.as_ref().is_some_and(|t| !t.is_empty()),
                    "{path} sans tag"
                );
                assert!(!op.responses.responses.is_empty(), "{path} sans réponse");
            }
        }
        assert!(
            spec.components
                .as_ref()
                .is_some_and(|c| c.security_schemes.contains_key("session"))
        );

        if let Ok(out) = std::env::var("OPENAPI_OUT") {
            std::fs::write(&out, json).expect("écriture de la spec");
        }
    }
}
