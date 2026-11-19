//! Lecture du catalogue de caisses.
//!
//! La table de butin (`loot_table`) est la source unique utilisée à la fois
//! pour afficher les probabilités et par le moteur de tirage : ce qui est
//! affiché est exactement ce qui est tiré.

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

/// Nombre de tickets possibles : un tirage donne un ticket entre 0 et 99 999.
pub const TICKET_RANGE: u32 = 100_000;

/// Objet d'une caisse avec sa plage de tickets gagnants.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct LootEntry {
    pub item_id: Uuid,
    pub name: String,
    pub image_url: Option<String>,
    /// common, rare, epic, legendary ou mythic.
    pub rarity: String,
    /// Valeur de revente en crédits.
    pub value: i64,
    /// Poids en millièmes de pourcent (100 000 = 100 %).
    pub drop_weight: i32,
    /// Probabilité en pourcent, pour l'affichage.
    pub probability: f64,
    /// Premier ticket gagnant (inclus).
    pub roll_min: u32,
    /// Dernier ticket gagnant (inclus).
    pub roll_max: u32,
}

/// Fiche détaillée d'une caisse.
#[derive(Debug, Serialize, ToSchema)]
pub struct CaseDetail {
    #[serde(flatten)]
    pub case: CaseSummary,
    /// Objets du plus rare au plus commun, avec leurs plages de tickets.
    pub items: Vec<LootEntry>,
    /// Faux si la table de butin ne totalise pas 100 % : l'ouverture est refusée.
    pub is_openable: bool,
}

/// Caisse active par son slug.
pub async fn find_case<'e, E>(executor: E, slug: &str) -> Result<Option<CaseSummary>, sqlx::Error>
where
    E: sqlx::PgExecutor<'e>,
{
    sqlx::query_as(
        "SELECT id, name, slug, image_url, description, price
         FROM cases
         WHERE slug = $1 AND is_active",
    )
    .bind(slug)
    .fetch_optional(executor)
    .await
}

#[derive(FromRow)]
struct LootRow {
    item_id: Uuid,
    name: String,
    image_url: Option<String>,
    rarity: String,
    value: i64,
    drop_weight: i32,
}

/// Table de butin d'une caisse.
///
/// L'ordre est canonique et fait partie de la preuve d'équité : poids
/// croissant (objets rares en premier), puis id d'objet. Les plages de tickets
/// sont attribuées dans cet ordre, à partir de 0.
pub async fn loot_table<'e, E>(executor: E, case_id: Uuid) -> Result<Vec<LootEntry>, sqlx::Error>
where
    E: sqlx::PgExecutor<'e>,
{
    let rows: Vec<LootRow> = sqlx::query_as(
        "SELECT i.id AS item_id, i.name, i.image_url, i.rarity::text AS rarity, i.value,
                ci.drop_weight
         FROM case_items ci
         JOIN items i ON i.id = ci.item_id
         WHERE ci.case_id = $1
         ORDER BY ci.drop_weight ASC, i.id ASC",
    )
    .bind(case_id)
    .fetch_all(executor)
    .await?;

    Ok(with_ranges(rows))
}

fn with_ranges(rows: Vec<LootRow>) -> Vec<LootEntry> {
    let mut next: u32 = 0;
    rows.into_iter()
        .map(|r| {
            let weight = r.drop_weight.max(0) as u32;
            let entry = LootEntry {
                item_id: r.item_id,
                name: r.name,
                image_url: r.image_url,
                rarity: r.rarity,
                value: r.value,
                drop_weight: r.drop_weight,
                probability: f64::from(weight) / 1_000.0,
                roll_min: next,
                roll_max: (next + weight).saturating_sub(1),
            };
            next += weight;
            entry
        })
        .collect()
}

/// Vrai si les plages couvrent exactement les tickets 0 à 99 999.
pub fn is_complete(table: &[LootEntry]) -> bool {
    let total: i64 = table.iter().map(|e| i64::from(e.drop_weight)).sum();
    total == i64::from(TICKET_RANGE)
}

/// Fiche d'une caisse avec ses probabilités, ou `None` si elle n'existe pas
/// ou n'est plus disponible.
pub async fn case_detail(pool: &PgPool, slug: &str) -> Result<Option<CaseDetail>, sqlx::Error> {
    let Some(case) = find_case(pool, slug).await? else {
        return Ok(None);
    };
    let items = loot_table(pool, case.id).await?;
    let is_openable = is_complete(&items);
    Ok(Some(CaseDetail {
        case,
        items,
        is_openable,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[sqlx::test]
    async fn liste_les_caisses_de_demo_par_prix(pool: PgPool) {
        let cases = list_cases(&pool).await.unwrap();
        let slugs: Vec<_> = cases.iter().map(|c| c.slug.as_str()).collect();
        assert_eq!(
            slugs,
            [
                "cloud",
                "heaven",
                "celestial",
                "olympus",
                "divine",
                "empyrean",
                "godlike",
                "pantheon"
            ]
        );
    }

    #[sqlx::test]
    async fn ignore_les_caisses_inactives(pool: PgPool) {
        sqlx::query("UPDATE cases SET is_active = false WHERE slug = 'olympus'")
            .execute(&pool)
            .await
            .unwrap();
        let cases = list_cases(&pool).await.unwrap();
        assert!(cases.iter().all(|c| c.slug != "olympus"));
    }

    #[sqlx::test]
    async fn les_caisses_de_demo_totalisent_100_pourcent(pool: PgPool) {
        for case in list_cases(&pool).await.unwrap() {
            let table = loot_table(&pool, case.id).await.unwrap();
            assert!(is_complete(&table), "{} ne fait pas 100 %", case.slug);
            assert_eq!(table.last().unwrap().roll_max, TICKET_RANGE - 1);
        }
    }

    #[sqlx::test]
    async fn plages_contigues_du_plus_rare_au_plus_commun(pool: PgPool) {
        let detail = case_detail(&pool, "heaven").await.unwrap().unwrap();
        let items = &detail.items;
        assert_eq!(items[0].name, "AK-47 | Redline");
        assert_eq!((items[0].roll_min, items[0].roll_max), (0, 499));
        assert_eq!(items[0].probability, 0.5);
        assert!(detail.is_openable);
        for pair in items.windows(2) {
            assert_eq!(pair[1].roll_min, pair[0].roll_max + 1);
        }
    }

    #[sqlx::test]
    async fn caisse_inconnue_ou_inactive(pool: PgPool) {
        assert!(case_detail(&pool, "nexiste-pas").await.unwrap().is_none());
        sqlx::query("UPDATE cases SET is_active = false WHERE slug = 'heaven'")
            .execute(&pool)
            .await
            .unwrap();
        assert!(case_detail(&pool, "heaven").await.unwrap().is_none());
    }
}
