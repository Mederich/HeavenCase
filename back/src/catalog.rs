//! Lecture du catalogue de caisses.

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

/// Caisse telle qu'affichée dans le catalogue.
#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct CaseSummary {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub image_url: Option<String>,
    pub description: Option<String>,
    /// Prix en crédits.
    pub price: i64,
}

/// Caisses actives, de la moins chère à la plus chère.
pub async fn list_cases(pool: &PgPool) -> Result<Vec<CaseSummary>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id, name, slug, image_url, description, price
         FROM cases
         WHERE is_active
         ORDER BY price, name",
    )
    .fetch_all(pool)
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[sqlx::test]
    async fn liste_les_caisses_de_demo_par_prix(pool: PgPool) {
        let cases = list_cases(&pool).await.unwrap();
        let slugs: Vec<_> = cases.iter().map(|c| c.slug.as_str()).collect();
        assert_eq!(slugs, ["aube", "zenith", "empyree"]);
    }

    #[sqlx::test]
    async fn ignore_les_caisses_inactives(pool: PgPool) {
        sqlx::query("UPDATE cases SET is_active = false WHERE slug = 'zenith'")
            .execute(&pool)
            .await
            .unwrap();
        let cases = list_cases(&pool).await.unwrap();
        assert!(cases.iter().all(|c| c.slug != "zenith"));
    }
}
