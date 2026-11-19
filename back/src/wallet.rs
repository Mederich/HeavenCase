//! Historique des mouvements de crédits du joueur (table `transactions`).

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

pub const MAX_PER_PAGE: i64 = 100;

/// Mouvement de crédits.
#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct TransactionEntry {
    pub id: Uuid,
    /// deposit, case_open, item_sell, withdrawal, bonus ou refund.
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub kind: String,
    /// Montant signé en crédits (négatif pour un achat).
    pub amount: i64,
    /// Solde après le mouvement.
    pub balance_after: i64,
    /// Caisse achetée ou skin vendu, quand il y en a un.
    pub detail: Option<String>,
    /// Date ISO 8601 (UTC).
    pub created_at: String,
}

/// Page de l'historique.
#[derive(Debug, Serialize, ToSchema)]
pub struct TransactionPage {
    pub items: Vec<TransactionEntry>,
    /// Nombre total de mouvements.
    pub total: i64,
    /// Numéro de page, à partir de 1.
    pub page: i64,
    pub per_page: i64,
}

/// Mouvements du joueur, du plus récent au plus ancien.
pub async fn list(
    pool: &PgPool,
    user_id: Uuid,
    page: i64,
    per_page: i64,
) -> Result<TransactionPage, sqlx::Error> {
    let page = page.max(1);
    let per_page = per_page.clamp(1, MAX_PER_PAGE);

    let total: i64 = sqlx::query_scalar("SELECT count(*) FROM transactions WHERE user_id = $1")
        .bind(user_id)
        .fetch_one(pool)
        .await?;

    let items = sqlx::query_as(
        "SELECT t.id, t.type::text AS type, t.amount, t.balance_after,
                COALESCE(c.name, i.name) AS detail,
                to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at
         FROM transactions t
         LEFT JOIN case_openings o ON t.type = 'case_open' AND o.id = t.reference_id
         LEFT JOIN cases c ON c.id = o.case_id
         LEFT JOIN inventory_items inv ON t.type = 'item_sell' AND inv.id = t.reference_id
         LEFT JOIN items i ON i.id = inv.item_id
         WHERE t.user_id = $1
         ORDER BY t.created_at DESC, t.id
         LIMIT $2 OFFSET $3",
    )
    .bind(user_id)
    .bind(per_page)
    .bind((page - 1) * per_page)
    .fetch_all(pool)
    .await?;

    Ok(TransactionPage {
        items,
        total,
        page,
        per_page,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{inventory, opening::open_case, testutil::create_user};

    #[sqlx::test]
    async fn liste_achats_et_reventes_avec_leur_detail(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let opened = open_case(&pool, user, "heaven").await.unwrap();
        let sale = inventory::sell(&pool, user, opened.inventory_item_id)
            .await
            .unwrap();

        let page = list(&pool, user, 1, 20).await.unwrap();
        assert_eq!(page.total, 2);
        assert_eq!(page.items.len(), 2);

        let open = page.items.iter().find(|t| t.kind == "case_open").unwrap();
        assert_eq!(
            (open.amount, open.balance_after, open.detail.as_deref()),
            (-150, 850, Some("Heaven Case"))
        );

        let sell = page.items.iter().find(|t| t.kind == "item_sell").unwrap();
        assert_eq!(sell.amount, sale.amount);
        assert_eq!(sell.balance_after, sale.balance_after);
        assert_eq!(sell.detail.as_deref(), Some(sale.item_name.as_str()));
    }

    #[sqlx::test]
    async fn pagine_et_isole_les_joueurs(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let other = create_user(&pool, 1_000).await;
        for _ in 0..5 {
            open_case(&pool, user, "cloud").await.unwrap();
        }
        open_case(&pool, other, "cloud").await.unwrap();

        let first = list(&pool, user, 1, 2).await.unwrap();
        let third = list(&pool, user, 3, 2).await.unwrap();
        let beyond = list(&pool, user, 4, 2).await.unwrap();
        assert_eq!(first.total, 5);
        assert_eq!(first.items.len(), 2);
        assert_eq!(third.items.len(), 1);
        assert!(beyond.items.is_empty());
        assert_eq!(third.items[0].balance_after, 950);
    }
}
