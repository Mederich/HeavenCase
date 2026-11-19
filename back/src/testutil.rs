//! Aides partagées par les tests d'intégration (`#[sqlx::test]`).

use sqlx::PgPool;
use uuid::Uuid;

/// Crée un joueur avec email validé et le solde donné, et renvoie son id.
pub async fn create_user(pool: &PgPool, balance: i64) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, balance, email_verified_at)
         VALUES ($1, $2, $3, 'hash-de-test', $4, now())",
    )
    .bind(id)
    .bind(format!("joueur-{id}"))
    .bind(format!("{id}@test.local"))
    .bind(balance)
    .execute(pool)
    .await
    .expect("création du joueur de test");
    id
}
