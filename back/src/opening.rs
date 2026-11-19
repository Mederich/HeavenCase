//! Ouverture d'une caisse : achat, tirage et attribution en une seule
//! transaction. Le résultat est enregistré avant d'être renvoyé au client,
//! l'animation côté front n'est que cosmétique.

use serde::Serialize;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    catalog::{self, LootEntry},
    eligibility,
    errors::AppError,
    fair, seeds,
};

/// Résultat d'une ouverture, de quoi lancer l'animation et vérifier le tirage.
#[derive(Debug, Serialize, ToSchema)]
pub struct OpeningResult {
    pub opening_id: Uuid,
    pub case_slug: String,
    /// Objet gagné, avec sa plage de tickets.
    pub item: LootEntry,
    /// Id de l'objet dans l'inventaire du joueur.
    pub inventory_item_id: Uuid,
    /// Ticket tiré, entre 0 et 99 999.
    pub ticket: u32,
    pub nonce: i32,
    pub server_seed_hash: String,
    pub client_seed: String,
    pub price_paid: i64,
    /// Solde du joueur après débit.
    pub balance_after: i64,
}

/// Nombre maximal de caisses ouvertes en une seule demande.
pub const MAX_OPEN_COUNT: u32 = 10;

/// Achète et ouvre `count` exemplaires de la caisse `slug` pour le joueur.
///
/// Tout est fait dans une transaction qui verrouille la ligne du joueur :
/// deux ouvertures simultanées ne peuvent pas dépenser le même solde ni
/// réutiliser le même nonce. Le solde doit couvrir le prix total, sinon rien
/// n'est débité. Chaque caisse a son propre nonce, sa ligne `case_openings`
/// et sa transaction `case_open`, vérifiables une par une.
pub async fn open_cases(
    pool: &PgPool,
    user_id: Uuid,
    slug: &str,
    count: u32,
) -> Result<Vec<OpeningResult>, AppError> {
    if !(1..=MAX_OPEN_COUNT).contains(&count) {
        return Err(AppError::BadRequest(format!(
            "Nombre de caisses invalide : entre 1 et {MAX_OPEN_COUNT}"
        )));
    }

    let mut tx = pool.begin().await?;

    let case = catalog::find_case(&mut *tx, slug)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Caisse « {slug} » introuvable")))?;

    let (balance, client_seed, banned): (i64, String, bool) = sqlx::query_as(
        "SELECT balance, client_seed, banned_at IS NOT NULL FROM users WHERE id = $1 FOR UPDATE",
    )
    .bind(user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Joueur introuvable".into()))?;

    if banned {
        return Err(AppError::Forbidden("Compte suspendu".into()));
    }
    eligibility::ensure(&mut tx, user_id).await?;
    let total = case.price * i64::from(count);
    if balance < total {
        return Err(AppError::PaymentRequired(format!(
            "Solde insuffisant : il te manque {} crédits",
            total - balance
        )));
    }

    let table = catalog::loot_table(&mut *tx, case.id).await?;
    if !catalog::is_complete(&table) {
        tracing::error!(case = %case.slug, "table de butin incomplète (≠ 100 %)");
        return Err(AppError::Conflict(
            "Cette caisse est momentanément indisponible".into(),
        ));
    }

    let seed = seeds::lock_active_seed(&mut tx, user_id).await?;
    let mut results = Vec::with_capacity(count as usize);

    for i in 0..count {
        let nonce = seed.nonce + i as i32;
        let ticket = fair::roll(&seed.seed, &client_seed, nonce);
        let item = fair::pick(&table, ticket)
            .cloned()
            .ok_or_else(|| AppError::Internal(format!("ticket {ticket} hors table pour {slug}")))?;

        let balance_after: i64 = sqlx::query_scalar(
            "UPDATE users SET balance = balance - $2 WHERE id = $1 RETURNING balance",
        )
        .bind(user_id)
        .bind(case.price)
        .fetch_one(&mut *tx)
        .await?;

        let opening_id: Uuid = sqlx::query_scalar(
            "INSERT INTO case_openings
                 (user_id, case_id, item_id, price_paid, item_value,
                  server_seed_hash, client_seed, nonce, roll_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id",
        )
        .bind(user_id)
        .bind(case.id)
        .bind(item.item_id)
        .bind(case.price)
        .bind(item.value)
        .bind(&seed.seed_hash)
        .bind(&client_seed)
        .bind(nonce)
        .bind(i64::from(ticket))
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query(
            "INSERT INTO transactions (user_id, type, amount, balance_after, reference_id)
             VALUES ($1, 'case_open', $2, $3, $4)",
        )
        .bind(user_id)
        .bind(-case.price)
        .bind(balance_after)
        .bind(opening_id)
        .execute(&mut *tx)
        .await?;

        let inventory_item_id: Uuid = sqlx::query_scalar(
            "INSERT INTO inventory_items (user_id, item_id, source_opening_id)
             VALUES ($1, $2, $3)
             RETURNING id",
        )
        .bind(user_id)
        .bind(item.item_id)
        .bind(opening_id)
        .fetch_one(&mut *tx)
        .await?;

        results.push(OpeningResult {
            opening_id,
            case_slug: case.slug.clone(),
            item,
            inventory_item_id,
            ticket,
            nonce,
            server_seed_hash: seed.seed_hash.clone(),
            client_seed: client_seed.clone(),
            price_paid: case.price,
            balance_after,
        });
    }

    sqlx::query("UPDATE server_seeds SET nonce = nonce + $2 WHERE id = $1")
        .bind(seed.id)
        .bind(count as i32)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(results)
}

/// Ligne de l'historique des ouvertures d'un joueur.
#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct OpeningHistoryEntry {
    pub id: Uuid,
    pub case_slug: String,
    pub case_name: String,
    pub item_id: Uuid,
    pub item_name: String,
    pub item_image_url: Option<String>,
    /// Usure : FN, MW, FT, WW ou BS.
    pub exterior: Option<String>,
    pub stattrak: bool,
    pub rarity: String,
    pub item_value: i64,
    pub price_paid: i64,
    pub ticket: i64,
    pub nonce: i32,
    pub server_seed_hash: String,
    /// Révélée seulement après rotation de la server seed.
    pub server_seed: Option<String>,
    pub client_seed: String,
    /// Date ISO 8601 (UTC).
    pub created_at: String,
}

/// Dernières ouvertures du joueur, de la plus récente à la plus ancienne.
pub async fn history(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
) -> Result<Vec<OpeningHistoryEntry>, sqlx::Error> {
    sqlx::query_as(
        "SELECT o.id, c.slug AS case_slug, c.name AS case_name,
                i.id AS item_id, i.name AS item_name, i.image_url AS item_image_url,
                i.exterior, i.stattrak, i.rarity::text AS rarity,
                o.item_value, o.price_paid, o.roll_value::bigint AS ticket, o.nonce,
                o.server_seed_hash, o.server_seed, o.client_seed,
                to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at
         FROM case_openings o
         JOIN cases c ON c.id = o.case_id
         JOIN items i ON i.id = o.item_id
         WHERE o.user_id = $1
         ORDER BY o.created_at DESC, o.nonce DESC
         LIMIT $2",
    )
    .bind(user_id)
    .bind(limit.clamp(1, 100))
    .fetch_all(pool)
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::create_user;

    async fn open_case(pool: &PgPool, user: Uuid, slug: &str) -> Result<OpeningResult, AppError> {
        open_cases(pool, user, slug, 1)
            .await
            .map(|mut v| v.remove(0))
    }

    async fn balance(pool: &PgPool, user: Uuid) -> i64 {
        sqlx::query_scalar("SELECT balance FROM users WHERE id = $1")
            .bind(user)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    async fn count(pool: &PgPool, table: &str, user: Uuid) -> i64 {
        sqlx::query_scalar(&format!("SELECT count(*) FROM {table} WHERE user_id = $1"))
            .bind(user)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    // Scénario 1 de HENC-24 et critères de HENC-12.
    #[sqlx::test]
    async fn debite_tire_et_credite_l_inventaire(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let before = seeds::get_status(&pool, user).await.unwrap();

        let result = open_case(&pool, user, "heaven").await.unwrap();

        assert_eq!(result.price_paid, 150);
        assert_eq!(result.balance_after, 850);
        assert_eq!(balance(&pool, user).await, 850);
        assert_eq!(result.nonce, 0);
        assert_eq!(result.server_seed_hash, before.server_seed_hash);
        assert!((result.item.roll_min..=result.item.roll_max).contains(&result.ticket));

        let (status, item_id): (String, Uuid) = sqlx::query_as(
            "SELECT status::text, item_id FROM inventory_items WHERE id = $1 AND user_id = $2",
        )
        .bind(result.inventory_item_id)
        .bind(user)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!((status.as_str(), item_id), ("owned", result.item.item_id));

        let (amount, after, reference): (i64, i64, Uuid) = sqlx::query_as(
            "SELECT amount, balance_after, reference_id FROM transactions
             WHERE user_id = $1 AND type = 'case_open'",
        )
        .bind(user)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!((amount, after, reference), (-150, 850, result.opening_id));

        assert_eq!(seeds::get_status(&pool, user).await.unwrap().nonce, 1);
    }

    #[sqlx::test]
    async fn solde_insuffisant_ne_change_rien(pool: PgPool) {
        let user = create_user(&pool, 50).await;
        let err = open_case(&pool, user, "heaven").await.unwrap_err();
        match err {
            AppError::PaymentRequired(msg) => assert!(msg.contains("100 crédits"), "{msg}"),
            other => panic!("attendu PaymentRequired, reçu {other:?}"),
        }
        assert_eq!(balance(&pool, user).await, 50);
        assert_eq!(count(&pool, "case_openings", user).await, 0);
        assert_eq!(count(&pool, "inventory_items", user).await, 0);
    }

    #[sqlx::test]
    async fn caisse_inconnue_ou_mal_configuree(pool: PgPool) {
        let user = create_user(&pool, 10_000).await;
        assert!(matches!(
            open_case(&pool, user, "nexiste-pas").await,
            Err(AppError::NotFound(_))
        ));

        sqlx::query(
            "UPDATE case_items SET drop_weight = drop_weight + 1
             WHERE case_id = (SELECT id FROM cases WHERE slug = 'heaven')
               AND drop_weight = (SELECT max(drop_weight) FROM case_items
                                  WHERE case_id = (SELECT id FROM cases WHERE slug = 'heaven'))",
        )
        .execute(&pool)
        .await
        .unwrap();
        assert!(matches!(
            open_case(&pool, user, "heaven").await,
            Err(AppError::Conflict(_))
        ));
        assert_eq!(balance(&pool, user).await, 10_000);
    }

    #[sqlx::test]
    async fn compte_suspendu(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        sqlx::query("UPDATE users SET banned_at = now() WHERE id = $1")
            .bind(user)
            .execute(&pool)
            .await
            .unwrap();
        assert!(matches!(
            open_case(&pool, user, "heaven").await,
            Err(AppError::Forbidden(_))
        ));
        assert_eq!(balance(&pool, user).await, 1_000);
    }

    #[sqlx::test]
    async fn compte_non_active_ne_peut_pas_ouvrir(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        sqlx::query("UPDATE users SET age_verified_at = NULL WHERE id = $1")
            .bind(user)
            .execute(&pool)
            .await
            .unwrap();
        assert!(matches!(
            open_case(&pool, user, "heaven").await,
            Err(AppError::Forbidden(_))
        ));

        sqlx::query("UPDATE users SET age_verified_at = now() WHERE id = $1")
            .bind(user)
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO terms_versions (version, published_at) VALUES ('v-suivante', now() + interval '1 day')")
            .execute(&pool)
            .await
            .unwrap();
        assert!(matches!(
            open_case(&pool, user, "heaven").await,
            Err(AppError::Forbidden(_))
        ));
        assert_eq!(balance(&pool, user).await, 1_000);
    }

    #[sqlx::test]
    async fn ouvertures_simultanees_ne_depensent_pas_deux_fois_le_solde(pool: PgPool) {
        let user = create_user(&pool, 200).await;
        let (a, b) = tokio::join!(
            open_case(&pool, user, "heaven"),
            open_case(&pool, user, "heaven")
        );
        assert_eq!([a.is_ok(), b.is_ok()].iter().filter(|ok| **ok).count(), 1);
        assert_eq!(balance(&pool, user).await, 50);
        assert_eq!(count(&pool, "case_openings", user).await, 1);
    }

    #[sqlx::test]
    async fn ouvre_plusieurs_caisses_avec_un_nonce_chacune(pool: PgPool) {
        let user = create_user(&pool, 1_000).await;
        let results = open_cases(&pool, user, "heaven", 5).await.unwrap();

        assert_eq!(results.len(), 5);
        assert_eq!(balance(&pool, user).await, 250);
        let nonces: Vec<_> = results.iter().map(|r| r.nonce).collect();
        assert_eq!(nonces, [0, 1, 2, 3, 4]);
        let afters: Vec<_> = results.iter().map(|r| r.balance_after).collect();
        assert_eq!(afters, [850, 700, 550, 400, 250]);
        assert_eq!(count(&pool, "case_openings", user).await, 5);
        assert_eq!(count(&pool, "inventory_items", user).await, 5);
        assert_eq!(count(&pool, "transactions", user).await, 5);
        assert_eq!(seeds::get_status(&pool, user).await.unwrap().nonce, 5);

        // L'ouverture suivante reprend au nonce 5.
        let next = open_case(&pool, user, "heaven").await.unwrap();
        assert_eq!(next.nonce, 5);
    }

    #[sqlx::test]
    async fn plusieurs_caisses_sans_solde_suffisant_ne_debite_rien(pool: PgPool) {
        let user = create_user(&pool, 400).await;
        match open_cases(&pool, user, "heaven", 3).await.unwrap_err() {
            AppError::PaymentRequired(msg) => assert!(msg.contains("50 crédits"), "{msg}"),
            other => panic!("attendu PaymentRequired, reçu {other:?}"),
        }
        assert_eq!(balance(&pool, user).await, 400);
        assert_eq!(count(&pool, "case_openings", user).await, 0);
        assert_eq!(seeds::get_status(&pool, user).await.unwrap().nonce, 0);
    }

    #[sqlx::test]
    async fn nombre_de_caisses_hors_limites(pool: PgPool) {
        let user = create_user(&pool, 100_000).await;
        for n in [0, MAX_OPEN_COUNT + 1] {
            assert!(matches!(
                open_cases(&pool, user, "heaven", n).await,
                Err(AppError::BadRequest(_))
            ));
        }
        assert_eq!(balance(&pool, user).await, 100_000);
    }

    // Scénario 3 de HENC-24 : après rotation, les 5 ouvertures se recalculent.
    #[sqlx::test]
    async fn rotation_permet_de_recalculer_les_ouvertures(pool: PgPool) {
        let user = create_user(&pool, 10_000).await;
        let mut won = Vec::new();
        for _ in 0..5 {
            won.push(open_case(&pool, user, "heaven").await.unwrap());
        }
        assert!(
            history(&pool, user, 10)
                .await
                .unwrap()
                .iter()
                .all(|o| o.server_seed.is_none()),
            "la seed active ne doit pas être visible"
        );

        let rotated = seeds::rotate(&pool, user).await.unwrap();
        assert_eq!(rotated.openings_count, 5);

        let past = history(&pool, user, 10).await.unwrap();
        assert_eq!(past.len(), 5);
        let case = catalog::find_case(&pool, "heaven").await.unwrap().unwrap();
        let table = catalog::loot_table(&pool, case.id).await.unwrap();
        for entry in &past {
            let revealed = entry.server_seed.as_deref().expect("seed révélée");
            assert_eq!(fair::hash_server_seed(revealed), entry.server_seed_hash);
            let ticket = fair::roll(revealed, &entry.client_seed, entry.nonce);
            assert_eq!(i64::from(ticket), entry.ticket);
            assert_eq!(fair::pick(&table, ticket).unwrap().item_id, entry.item_id);
        }
        let mut nonces: Vec<_> = past.iter().map(|o| o.nonce).collect();
        nonces.sort();
        assert_eq!(nonces, [0, 1, 2, 3, 4]);
        assert!(
            won.iter()
                .all(|w| w.server_seed_hash == rotated.revealed_server_seed_hash)
        );
    }
}
