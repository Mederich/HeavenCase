use crate::{mailer::Mailer, payments::StripeConfig};
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub mailer: Mailer,
    pub app_url: String,
    pub http: reqwest::Client,
    /// None : clés Stripe absentes, dépôt désactivé.
    pub stripe: Option<StripeConfig>,
}

impl AppState {
    pub fn new(pool: PgPool, mailer: Mailer) -> Self {
        let stripe = StripeConfig::from_env();
        if stripe.is_none() {
            tracing::warn!("STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET absente : dépôt désactivé");
        }
        Self {
            pool,
            mailer,
            app_url: std::env::var("APP_URL").expect("APP_URL manquante"),
            http: reqwest::Client::new(),
            stripe,
        }
    }
}
