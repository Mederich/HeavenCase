//! Inventaire du joueur : skins gagnés en ouvrant des caisses.

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

/// Statuts d'inventaire qu'on peut filtrer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatusFilter {
    Owned,
    Sold,
    All,
}

impl StatusFilter {
    pub fn parse(value: Option<&str>) -> Option<Self> {
        match value.unwrap_or("owned") {
            "owned" => Some(Self::Owned),
            "sold" => Some(Self::Sold),
            "all" => Some(Self::All),
            _ => None,
        }
    }

    fn sql(self) -> Option<&'static str> {
        match self {
            Self::Owned => Some("owned"),
            Self::Sold => Some("sold"),
            Self::All => None,
        }
    }
}

/// Skin de l'inventaire, avec la caisse dont il provient.
#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct InventoryEntry {
    /// Id de la ligne d'inventaire (à utiliser pour la revente).
    pub id: Uuid,
    pub item_id: Uuid,
    pub name: String,
    pub image_url: Option<String>,
    /// common, rare, epic, legendary ou mythic.
    pub rarity: String,
    /// Valeur de revente en crédits.
    pub value: i64,
    /// Usure : FN, MW, FT, WW ou BS.
    pub exterior: Option<String>,
    pub stattrak: bool,
    /// owned, sold, withdrawn ou upgraded.
    pub status: String,
    pub case_name: Option<String>,
    pub case_slug: Option<String>,
    /// Date d'obtention, ISO 8601 (UTC).
    pub acquired_at: String,
}

/// Inventaire du joueur, du plus récent au plus ancien.
pub async fn list(
    pool: &PgPool,
    user_id: Uuid,
    status: StatusFilter,
) -> Result<Vec<InventoryEntry>, sqlx::Error> {
    sqlx::query_as(
        "SELECT inv.id, i.id AS item_id, i.name, i.image_url, i.rarity::text AS rarity, i.value,
                i.exterior, i.stattrak, inv.status::text AS status,
                c.name AS case_name, c.slug AS case_slug,
                to_char(inv.acquired_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS acquired_at
         FROM inventory_items inv
         JOIN items i ON i.id = inv.item_id
         LEFT JOIN case_openings o ON o.id = inv.source_opening_id
         LEFT JOIN cases c ON c.id = o.case_id
         WHERE inv.user_id = $1
           AND ($2::TEXT IS NULL OR inv.status::text = $2)
         ORDER BY inv.acquired_at DESC, inv.id",
    )
    .bind(user_id)
    .bind(status.sql())
    .fetch_all(pool)
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{opening::open_case, testutil::create_user};

    #[test]
    fn filtre_de_statut() {
        assert_eq!(StatusFilter::parse(None), Some(StatusFilter::Owned));
        assert_eq!(StatusFilter::parse(Some("all")), Some(StatusFilter::All));
        assert_eq!(StatusFilter::parse(Some("sold")), Some(StatusFilter::Sold));
        assert_eq!(StatusFilter::parse(Some("vendu")), None);
    }

    #[sqlx::test]
    async fn liste_les_skins_du_joueur_avec_leur_caisse(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let other = create_user(&pool, 1_000).await;
        let first = open_case(&pool, user, "heaven").await.unwrap();
        let second = open_case(&pool, user, "cloud").await.unwrap();
        open_case(&pool, other, "heaven").await.unwrap();

        let items = list(&pool, user, StatusFilter::Owned).await.unwrap();
        assert_eq!(items.len(), 2);
        let ids: Vec<_> = items.iter().map(|i| i.id).collect();
        assert!(ids.contains(&first.inventory_item_id));
        assert!(ids.contains(&second.inventory_item_id));

        let entry = items
            .iter()
            .find(|i| i.id == first.inventory_item_id)
            .unwrap();
        assert_eq!(entry.item_id, first.item.item_id);
        assert_eq!(entry.value, first.item.value);
        assert_eq!(entry.status, "owned");
        assert_eq!(entry.case_slug.as_deref(), Some("heaven"));
    }

    #[sqlx::test]
    async fn filtre_par_statut(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let opened = open_case(&pool, user, "heaven").await.unwrap();
        sqlx::query("UPDATE inventory_items SET status = 'sold' WHERE id = $1")
            .bind(opened.inventory_item_id)
            .execute(&pool)
            .await
            .unwrap();

        assert!(
            list(&pool, user, StatusFilter::Owned)
                .await
                .unwrap()
                .is_empty()
        );
        assert_eq!(
            list(&pool, user, StatusFilter::Sold).await.unwrap().len(),
            1
        );
        assert_eq!(list(&pool, user, StatusFilter::All).await.unwrap().len(), 1);
    }
}
