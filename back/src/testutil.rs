//! Aides partagées par les tests d'intégration (`#[sqlx::test]`).

use sqlx::PgPool;
use uuid::Uuid;

/// Crée un joueur actif (email validé, majeur, CGU acceptées) avec le solde donné.
pub async fn create_user(pool: &PgPool, balance: i64) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, balance, email_verified_at,
                            birth_date, age_verified_at)
         VALUES ($1, $2, $3, 'hash-de-test', $4, now(), '1990-01-01', now())",
    )
    .bind(id)
    .bind(format!("joueur-{id}"))
    .bind(format!("{id}@test.local"))
    .bind(balance)
    .execute(pool)
    .await
    .expect("création du joueur de test");
    sqlx::query(
        "INSERT INTO terms_acceptances (user_id, version)
         SELECT $1, version FROM terms_versions ORDER BY published_at DESC LIMIT 1",
    )
    .bind(id)
    .execute(pool)
    .await
    .expect("acceptation des CGU de test");
    id
}
