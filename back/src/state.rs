use crate::mailer::Mailer;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub mailer: Mailer,
    pub app_url: String,
}

impl AppState {
    pub fn new(pool: PgPool, mailer: Mailer) -> Self {
        Self {
            pool,
            mailer,
            app_url: std::env::var("APP_URL").expect("APP_URL manquante"),
        }
    }
}
