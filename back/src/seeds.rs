//! Gestion des seeds provably fair d'un joueur : server seed active (dont
//! seule l'empreinte est publique), client seed modifiable et nonce.

use serde::Serialize;
use sqlx::{FromRow, PgConnection, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{errors::AppError, fair};

/// Server seed active d'un joueur (usage interne : contient la seed secrète).
#[derive(Debug, FromRow)]
pub struct ActiveSeed {
    pub id: Uuid,
    pub seed: String,
    pub seed_hash: String,
    pub nonce: i32,
}

/// Ce que le joueur voit avant d'ouvrir une caisse.
#[derive(Debug, Serialize, ToSchema)]
pub struct SeedStatus {
    /// SHA-256 de la server seed active.
    pub server_seed_hash: String,
    pub client_seed: String,
    /// Nonce qui sera utilisé pour la prochaine ouverture.
    pub nonce: i32,
}

/// Résultat d'une rotation de server seed.
#[derive(Debug, Serialize, ToSchema)]
pub struct RotateResult {
    /// Ancienne server seed, désormais révélée en clair.
    pub revealed_server_seed: String,
    pub revealed_server_seed_hash: String,
    /// Nombre d'ouvertures faites avec l'ancienne seed (nonces 0 à n-1).
    pub openings_count: i32,
    /// Nouvelle seed active.
    pub current: SeedStatus,
}

/// Server seed active du joueur, verrouillée pour la transaction en cours.
/// En crée une si le joueur n'en a pas encore.
pub async fn lock_active_seed(
    conn: &mut PgConnection,
    user_id: Uuid,
) -> Result<ActiveSeed, sqlx::Error> {
    const SELECT_ACTIVE: &str = "SELECT id, seed, seed_hash, nonce FROM server_seeds
         WHERE user_id = $1 AND revealed_at IS NULL
         FOR UPDATE";

    if let Some(seed) = sqlx::query_as(SELECT_ACTIVE)
        .bind(user_id)
        .fetch_optional(&mut *conn)
        .await?
    {
        return Ok(seed);
    }

    let seed = fair::generate_server_seed();
    sqlx::query(
        "INSERT INTO server_seeds (user_id, seed, seed_hash) VALUES ($1, $2, $3)
         ON CONFLICT (user_id) WHERE revealed_at IS NULL DO NOTHING",
    )
    .bind(user_id)
    .bind(&seed)
    .bind(fair::hash_server_seed(&seed))
    .execute(&mut *conn)
    .await?;

    // Relecture : en cas de création concurrente, c'est l'autre seed qui gagne.
    sqlx::query_as(SELECT_ACTIVE)
        .bind(user_id)
        .fetch_one(&mut *conn)
        .await
}

async fn client_seed(conn: &mut PgConnection, user_id: Uuid) -> Result<String, AppError> {
    sqlx::query_scalar("SELECT client_seed FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(&mut *conn)
        .await?
        .ok_or_else(|| AppError::NotFound("Joueur introuvable".into()))
}

async fn status(conn: &mut PgConnection, user_id: Uuid) -> Result<SeedStatus, AppError> {
    let client_seed = client_seed(conn, user_id).await?;
    let active = lock_active_seed(conn, user_id).await?;
    Ok(SeedStatus {
        server_seed_hash: active.seed_hash,
        client_seed,
        nonce: active.nonce,
    })
}

/// Seeds courantes du joueur.
pub async fn get_status(pool: &PgPool, user_id: Uuid) -> Result<SeedStatus, AppError> {
    let mut tx = pool.begin().await?;
    let status = status(&mut tx, user_id).await?;
    tx.commit().await?;
    Ok(status)
}

/// Longueur maximale d'une client seed.
const CLIENT_SEED_MAX_LEN: usize = 64;

/// Remplace la client seed du joueur (les ouvertures passées gardent la leur).
pub async fn set_client_seed(
    pool: &PgPool,
    user_id: Uuid,
    client_seed: &str,
) -> Result<SeedStatus, AppError> {
    let client_seed = client_seed.trim();
    let valid_chars = client_seed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'));
    if client_seed.is_empty() || client_seed.len() > CLIENT_SEED_MAX_LEN || !valid_chars {
        return Err(AppError::BadRequest(format!(
            "La client seed doit faire 1 à {CLIENT_SEED_MAX_LEN} caractères \
             (lettres, chiffres, « - », « _ » ou « . »)"
        )));
    }

    let mut tx = pool.begin().await?;
    let updated = sqlx::query("UPDATE users SET client_seed = $2 WHERE id = $1")
        .bind(user_id)
        .bind(client_seed)
        .execute(&mut *tx)
        .await?;
    if updated.rows_affected() == 0 {
        return Err(AppError::NotFound("Joueur introuvable".into()));
    }
    let status = status(&mut tx, user_id).await?;
    tx.commit().await?;
    Ok(status)
}

/// Révèle la server seed active, la recopie en clair sur les ouvertures
/// qu'elle a servi à tirer, et en active une nouvelle (nonce remis à 0).
pub async fn rotate(pool: &PgPool, user_id: Uuid) -> Result<RotateResult, AppError> {
    let mut tx = pool.begin().await?;
    // Vérifie l'existence du joueur avant de créer quoi que ce soit.
    client_seed(&mut tx, user_id).await?;
    let old = lock_active_seed(&mut tx, user_id).await?;

    sqlx::query("UPDATE server_seeds SET revealed_at = now() WHERE id = $1")
        .bind(old.id)
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        "UPDATE case_openings SET server_seed = $3
         WHERE user_id = $1 AND server_seed_hash = $2 AND server_seed IS NULL",
    )
    .bind(user_id)
    .bind(&old.seed_hash)
    .bind(&old.seed)
    .execute(&mut *tx)
    .await?;

    let current = status(&mut tx, user_id).await?;
    tx.commit().await?;

    Ok(RotateResult {
        revealed_server_seed: old.seed,
        revealed_server_seed_hash: old.seed_hash,
        openings_count: old.nonce,
        current,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::create_user;

    #[sqlx::test]
    async fn cree_une_seed_au_premier_appel_puis_la_reutilise(pool: PgPool) {
        let user = create_user(&pool, 0).await;
        let first = get_status(&pool, user).await.unwrap();
        let again = get_status(&pool, user).await.unwrap();
        assert_eq!(first.server_seed_hash, again.server_seed_hash);
        assert_eq!(first.nonce, 0);
        assert_eq!(first.server_seed_hash.len(), 64);
    }

    #[sqlx::test]
    async fn rotation_revele_l_ancienne_seed(pool: PgPool) {
        let user = create_user(&pool, 0).await;
        let before = get_status(&pool, user).await.unwrap();

        let rotated = rotate(&pool, user).await.unwrap();
        assert_eq!(rotated.revealed_server_seed_hash, before.server_seed_hash);
        assert_eq!(
            fair::hash_server_seed(&rotated.revealed_server_seed),
            before.server_seed_hash
        );
        assert_ne!(rotated.current.server_seed_hash, before.server_seed_hash);
        assert_eq!(rotated.current.nonce, 0);

        let active: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM server_seeds WHERE user_id = $1 AND revealed_at IS NULL",
        )
        .bind(user)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(active, 1);
    }

    #[sqlx::test]
    async fn client_seed_modifiable_et_validee(pool: PgPool) {
        let user = create_user(&pool, 0).await;
        let status = set_client_seed(&pool, user, "  ma-seed_42 ").await.unwrap();
        assert_eq!(status.client_seed, "ma-seed_42");

        for invalid in ["", "   ", "avec espace", "é", &"x".repeat(65)] {
            assert!(matches!(
                set_client_seed(&pool, user, invalid).await,
                Err(AppError::BadRequest(_))
            ));
        }
    }

    #[sqlx::test]
    async fn joueur_inconnu(pool: PgPool) {
        let ghost = Uuid::new_v4();
        assert!(matches!(
            get_status(&pool, ghost).await,
            Err(AppError::NotFound(_))
        ));
        assert!(matches!(
            rotate(&pool, ghost).await,
            Err(AppError::NotFound(_))
        ));
    }
}
