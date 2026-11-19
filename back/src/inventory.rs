//! Inventaire du joueur : skins gagnés en ouvrant des caisses.

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::errors::AppError;

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

/// Résultat d'une revente.
#[derive(Debug, Serialize, ToSchema)]
pub struct SaleResult {
    pub inventory_item_id: Uuid,
    pub item_name: String,
    /// Crédits reçus (valeur du skin).
    pub amount: i64,
    /// Solde du joueur après la vente.
    pub balance_after: i64,
}

/// Revend un skin de l'inventaire à sa valeur.
///
/// Une seule transaction verrouille le joueur puis la ligne d'inventaire :
/// deux ventes simultanées du même skin ne créditent qu'une fois.
pub async fn sell(
    pool: &PgPool,
    user_id: Uuid,
    inventory_item_id: Uuid,
) -> Result<SaleResult, AppError> {
    let mut tx = pool.begin().await?;

    let banned: Option<bool> =
        sqlx::query_scalar("SELECT banned_at IS NOT NULL FROM users WHERE id = $1 FOR UPDATE")
            .bind(user_id)
            .fetch_optional(&mut *tx)
            .await?;
    match banned {
        None => return Err(AppError::Unauthorized("Joueur introuvable".into())),
        Some(true) => return Err(AppError::Forbidden("Compte suspendu".into())),
        Some(false) => {}
    }

    let row: Option<(String, String, i64)> = sqlx::query_as(
        "SELECT inv.status::text, i.name, i.value
         FROM inventory_items inv
         JOIN items i ON i.id = inv.item_id
         WHERE inv.id = $1 AND inv.user_id = $2
         FOR UPDATE OF inv",
    )
    .bind(inventory_item_id)
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some((status, item_name, value)) = row else {
        return Err(AppError::NotFound(
            "Objet introuvable dans ton inventaire".into(),
        ));
    };
    if status != "owned" {
        return Err(AppError::Conflict(match status.as_str() {
            "sold" => "Objet déjà vendu".into(),
            _ => "Objet plus disponible".into(),
        }));
    }

    sqlx::query("UPDATE inventory_items SET status = 'sold' WHERE id = $1")
        .bind(inventory_item_id)
        .execute(&mut *tx)
        .await?;

    let balance_after: i64 = sqlx::query_scalar(
        "UPDATE users SET balance = balance + $2 WHERE id = $1 RETURNING balance",
    )
    .bind(user_id)
    .bind(value)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO transactions (user_id, type, amount, balance_after, reference_id)
         VALUES ($1, 'item_sell', $2, $3, $4)",
    )
    .bind(user_id)
    .bind(value)
    .bind(balance_after)
    .bind(inventory_item_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(SaleResult {
        inventory_item_id,
        item_name,
        amount: value,
        balance_after,
    })
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

    async fn balance(pool: &PgPool, user: Uuid) -> i64 {
        sqlx::query_scalar("SELECT balance FROM users WHERE id = $1")
            .bind(user)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    #[sqlx::test]
    async fn vend_un_skin_et_credite_le_solde(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let opened = open_case(&pool, user, "heaven").await.unwrap();
        let value = opened.item.value;

        let sale = sell(&pool, user, opened.inventory_item_id).await.unwrap();

        assert_eq!(sale.amount, value);
        assert_eq!(sale.balance_after, 850 + value);
        assert_eq!(balance(&pool, user).await, 850 + value);

        let status: String =
            sqlx::query_scalar("SELECT status::text FROM inventory_items WHERE id = $1")
                .bind(opened.inventory_item_id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(status, "sold");

        let (amount, after, reference): (i64, i64, Uuid) = sqlx::query_as(
            "SELECT amount, balance_after, reference_id FROM transactions
             WHERE user_id = $1 AND type = 'item_sell'",
        )
        .bind(user)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(
            (amount, after, reference),
            (value, 850 + value, opened.inventory_item_id)
        );
    }

    #[sqlx::test]
    async fn refuse_une_deuxieme_vente(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let opened = open_case(&pool, user, "heaven").await.unwrap();
        sell(&pool, user, opened.inventory_item_id).await.unwrap();
        let after_first = balance(&pool, user).await;

        assert!(matches!(
            sell(&pool, user, opened.inventory_item_id).await,
            Err(AppError::Conflict(_))
        ));
        assert_eq!(balance(&pool, user).await, after_first);
    }

    #[sqlx::test]
    async fn ventes_simultanees_ne_creditent_qu_une_fois(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let opened = open_case(&pool, user, "heaven").await.unwrap();
        let id = opened.inventory_item_id;

        let (a, b) = tokio::join!(sell(&pool, user, id), sell(&pool, user, id));
        assert_eq!([a.is_ok(), b.is_ok()].iter().filter(|ok| **ok).count(), 1);
        assert_eq!(balance(&pool, user).await, 850 + opened.item.value);
    }

    #[sqlx::test]
    async fn ne_vend_pas_le_skin_d_un_autre_joueur(pool: PgPool) {
        let owner = create_user(&pool, 1_000).await;
        let thief = create_user(&pool, 0).await;
        let opened = open_case(&pool, owner, "heaven").await.unwrap();

        assert!(matches!(
            sell(&pool, thief, opened.inventory_item_id).await,
            Err(AppError::NotFound(_))
        ));
        assert_eq!(balance(&pool, thief).await, 0);
    }

    #[sqlx::test]
    async fn compte_suspendu_ne_vend_pas(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let opened = open_case(&pool, user, "heaven").await.unwrap();
        sqlx::query("UPDATE users SET banned_at = now() WHERE id = $1")
            .bind(user)
            .execute(&pool)
            .await
            .unwrap();

        assert!(matches!(
            sell(&pool, user, opened.inventory_item_id).await,
            Err(AppError::Forbidden(_))
        ));
        assert_eq!(balance(&pool, user).await, 850);
    }
}
