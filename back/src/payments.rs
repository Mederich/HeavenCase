//! Dépôt de crédits par carte avec Stripe Checkout (HENC-20).
//!
//! Le joueur choisit un pack, le serveur crée un paiement `pending` et une
//! session Checkout (3D Secure géré par Stripe). Seul le webhook signé de
//! Stripe crédite le solde : le retour du navigateur ne fait qu'afficher
//! l'état du paiement. Un même paiement ne crédite qu'une fois.

use hmac::{Hmac, KeyInit, Mac};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use sqlx::{FromRow, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{eligibility, errors::AppError};

/// Packs proposés : prix en centimes d'euro, 1 crédit = 0,01 €.
#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
pub struct Pack {
    pub id: &'static str,
    /// Prix en centimes d'euro.
    pub amount: i64,
    pub credits: i64,
}

pub const PACKS: [Pack; 4] = [
    Pack {
        id: "10",
        amount: 1_000,
        credits: 1_000,
    },
    Pack {
        id: "20",
        amount: 2_000,
        credits: 2_000,
    },
    Pack {
        id: "50",
        amount: 5_000,
        credits: 5_000,
    },
    Pack {
        id: "100",
        amount: 10_000,
        credits: 10_000,
    },
];

pub fn find_pack(id: &str) -> Option<Pack> {
    PACKS.iter().copied().find(|p| p.id == id)
}

/// Clés Stripe lues dans l'environnement ; absentes = dépôt désactivé.
#[derive(Clone)]
pub struct StripeConfig {
    pub secret_key: String,
    pub webhook_secret: String,
}

impl StripeConfig {
    pub fn from_env() -> Option<Self> {
        let secret_key = std::env::var("STRIPE_SECRET_KEY")
            .ok()
            .filter(|v| !v.is_empty())?;
        let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
            .ok()
            .filter(|v| !v.is_empty())?;
        if !secret_key.starts_with("sk_test_") {
            tracing::warn!("STRIPE_SECRET_KEY n'est pas une clé de test (sk_test_)");
        }
        Some(Self {
            secret_key,
            webhook_secret,
        })
    }
}

/// Paiement tel que le joueur le voit.
#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct Payment {
    pub id: Uuid,
    /// pending, completed, failed ou refunded.
    pub status: String,
    /// Prix en centimes d'euro.
    pub amount: i64,
    pub credits: Option<i64>,
    pub failure_reason: Option<String>,
    /// ISO 8601 (UTC).
    pub created_at: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CheckoutStarted {
    pub payment_id: Uuid,
    /// Page de paiement Stripe vers laquelle rediriger le joueur.
    pub checkout_url: String,
}

#[derive(Deserialize)]
struct CheckoutSession {
    id: String,
    url: Option<String>,
}

/// Crée le paiement en attente et la session Checkout Stripe.
pub async fn start_checkout(
    pool: &PgPool,
    http: &reqwest::Client,
    stripe: &StripeConfig,
    app_url: &str,
    user_id: Uuid,
    pack_id: &str,
) -> Result<CheckoutStarted, AppError> {
    let pack = find_pack(pack_id).ok_or_else(|| AppError::BadRequest("Pack inconnu".into()))?;

    let mut conn = pool.acquire().await?;
    eligibility::ensure(&mut conn, user_id).await?;
    drop(conn);

    let payment_id = Uuid::new_v4();
    let back = format!("{app_url}/deposit/return?payment={payment_id}");
    let form: Vec<(&str, String)> = vec![
        ("mode", "payment".into()),
        ("client_reference_id", payment_id.to_string()),
        ("metadata[payment_id]", payment_id.to_string()),
        ("metadata[user_id]", user_id.to_string()),
        ("line_items[0][quantity]", "1".into()),
        ("line_items[0][price_data][currency]", "eur".into()),
        (
            "line_items[0][price_data][unit_amount]",
            pack.amount.to_string(),
        ),
        (
            "line_items[0][price_data][product_data][name]",
            format!("{} crédits HeavenCases", pack.credits),
        ),
        ("payment_method_types[0]", "card".into()),
        ("success_url", format!("{back}&status=success")),
        ("cancel_url", format!("{back}&status=cancel")),
    ];

    let response = http
        .post("https://api.stripe.com/v1/checkout/sessions")
        .bearer_auth(&stripe.secret_key)
        .header("Idempotency-Key", payment_id.to_string())
        .form(&form)
        .send()
        .await
        .map_err(|e| AppError::Unavailable(format!("Stripe injoignable : {e}")))?;
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Stripe a refusé la session ({status}) : {body}"
        )));
    }
    let session: CheckoutSession = response
        .json()
        .await
        .map_err(|e| AppError::Unavailable(format!("réponse Stripe illisible : {e}")))?;
    let checkout_url = session
        .url
        .ok_or_else(|| AppError::Unavailable("session Stripe sans URL".into()))?;

    sqlx::query(
        "INSERT INTO payments (id, user_id, provider, provider_tx_id, amount, credits, currency, status)
         VALUES ($1, $2, 'stripe', $3, $4, $5, 'eur', 'pending')",
    )
    .bind(payment_id)
    .bind(user_id)
    .bind(&session.id)
    .bind(pack.amount)
    .bind(pack.credits)
    .execute(pool)
    .await?;

    Ok(CheckoutStarted {
        payment_id,
        checkout_url,
    })
}

/// Paiement du joueur (jamais celui d'un autre compte).
pub async fn get(pool: &PgPool, user_id: Uuid, payment_id: Uuid) -> Result<Payment, AppError> {
    sqlx::query_as(
        "SELECT id, status::text AS status, amount, credits, failure_reason,
                to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS created_at
         FROM payments WHERE id = $1 AND user_id = $2",
    )
    .bind(payment_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Paiement introuvable".into()))
}

/// Écart toléré entre l'horodatage signé et l'heure du serveur.
const SIGNATURE_TOLERANCE_SECS: i64 = 300;

/// Vérifie l'en-tête `Stripe-Signature` (`t=…,v1=…`) : HMAC-SHA256 de `t.corps`.
pub fn verify_signature(payload: &[u8], header: &str, secret: &str, now: i64) -> bool {
    let mut timestamp = None;
    let mut signatures = Vec::new();
    for part in header.split(',') {
        match part.trim().split_once('=') {
            Some(("t", v)) => timestamp = v.parse::<i64>().ok(),
            Some(("v1", v)) => signatures.push(v),
            _ => {}
        }
    }
    let Some(timestamp) = timestamp else {
        return false;
    };
    if (now - timestamp).abs() > SIGNATURE_TOLERANCE_SECS {
        return false;
    }
    signatures.iter().any(|sig| {
        let Ok(expected) = hex::decode(sig) else {
            return false;
        };
        let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else {
            return false;
        };
        mac.update(timestamp.to_string().as_bytes());
        mac.update(b".");
        mac.update(payload);
        mac.verify_slice(&expected).is_ok()
    })
}

/// Traite un événement Stripe déjà authentifié. Idempotent.
pub async fn handle_event(pool: &PgPool, event: &Value) -> Result<(), AppError> {
    let event_id = event["id"].as_str().unwrap_or_default();
    let kind = event["type"].as_str().unwrap_or_default();
    let session = &event["data"]["object"];
    let session_id = session["id"].as_str().unwrap_or_default();
    if event_id.is_empty() || session_id.is_empty() {
        return Err(AppError::BadRequest("Événement incomplet".into()));
    }

    let mut tx = pool.begin().await?;
    let fresh = sqlx::query(
        "INSERT INTO payment_events (event_id) VALUES ($1) ON CONFLICT (event_id) DO NOTHING",
    )
    .bind(event_id)
    .execute(&mut *tx)
    .await?
    .rows_affected()
        == 1;
    if !fresh {
        return Ok(());
    }

    match kind {
        "checkout.session.completed" | "checkout.session.async_payment_succeeded" => {
            if session["payment_status"].as_str() == Some("paid") {
                complete(&mut tx, session_id).await?;
            }
        }
        "checkout.session.async_payment_failed" => {
            fail(&mut tx, session_id, "Paiement refusé").await?;
        }
        "checkout.session.expired" => {
            fail(&mut tx, session_id, "Paiement abandonné ou expiré").await?;
        }
        _ => {}
    }

    tx.commit().await?;
    Ok(())
}

/// Passe le paiement en `completed` et crédite le pack, une seule fois.
async fn complete(tx: &mut sqlx::PgConnection, session_id: &str) -> Result<(), AppError> {
    let row: Option<(Uuid, Uuid, i64)> = sqlx::query_as(
        "UPDATE payments SET status = 'completed', completed_at = now(), failure_reason = NULL
         WHERE provider = 'stripe' AND provider_tx_id = $1 AND status <> 'completed'
         RETURNING id, user_id, credits",
    )
    .bind(session_id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some((payment_id, user_id, credits)) = row else {
        return Ok(());
    };

    let balance_after: i64 = sqlx::query_scalar(
        "UPDATE users SET balance = balance + $2 WHERE id = $1 RETURNING balance",
    )
    .bind(user_id)
    .bind(credits)
    .fetch_one(&mut *tx)
    .await?;
    sqlx::query(
        "INSERT INTO transactions (user_id, type, amount, balance_after, reference_id)
         VALUES ($1, 'deposit', $2, $3, $4)",
    )
    .bind(user_id)
    .bind(credits)
    .bind(balance_after)
    .bind(payment_id)
    .execute(&mut *tx)
    .await?;
    Ok(())
}

async fn fail(tx: &mut sqlx::PgConnection, session_id: &str, reason: &str) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE payments SET status = 'failed', failure_reason = $2
         WHERE provider = 'stripe' AND provider_tx_id = $1 AND status = 'pending'",
    )
    .bind(session_id)
    .bind(reason)
    .execute(tx)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::create_user;
    use serde_json::json;

    fn sign(payload: &[u8], secret: &str, t: i64) -> String {
        let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(format!("{t}.").as_bytes());
        mac.update(payload);
        format!("t={t},v1={}", hex::encode(mac.finalize().into_bytes()))
    }

    #[test]
    fn verifie_la_signature_stripe() {
        let body = br#"{"id":"evt_1"}"#;
        let now = 1_800_000_000;
        let header = sign(body, "whsec_test", now);
        assert!(verify_signature(body, &header, "whsec_test", now));
        assert!(verify_signature(body, &header, "whsec_test", now + 200));
        assert!(!verify_signature(body, &header, "whsec_autre", now));
        assert!(!verify_signature(
            br#"{"id":"evt_2"}"#,
            &header,
            "whsec_test",
            now
        ));
        assert!(!verify_signature(body, &header, "whsec_test", now + 301));
        assert!(!verify_signature(body, "v1=abc", "whsec_test", now));
    }

    #[test]
    fn packs_un_credit_par_centime() {
        assert!(PACKS.iter().all(|p| p.amount == p.credits));
        assert_eq!(find_pack("20").unwrap().credits, 2_000);
        assert!(find_pack("15").is_none());
    }

    async fn pending_payment(pool: &PgPool, user: Uuid, session: &str) -> Uuid {
        sqlx::query_scalar(
            "INSERT INTO payments (user_id, provider, provider_tx_id, amount, credits, status)
             VALUES ($1, 'stripe', $2, 2000, 2000, 'pending') RETURNING id",
        )
        .bind(user)
        .bind(session)
        .fetch_one(pool)
        .await
        .unwrap()
    }

    fn event(id: &str, kind: &str, session: &str, paid: bool) -> Value {
        json!({
            "id": id,
            "type": kind,
            "data": { "object": {
                "id": session,
                "payment_status": if paid { "paid" } else { "unpaid" }
            } }
        })
    }

    async fn balance(pool: &PgPool, user: Uuid) -> i64 {
        sqlx::query_scalar("SELECT balance FROM users WHERE id = $1")
            .bind(user)
            .fetch_one(pool)
            .await
            .unwrap()
    }

    #[sqlx::test]
    async fn credite_une_seule_fois(pool: PgPool) {
        let user = create_user(&pool, 100).await;
        let payment = pending_payment(&pool, user, "cs_test_1").await;

        let paid = event("evt_1", "checkout.session.completed", "cs_test_1", true);
        handle_event(&pool, &paid).await.unwrap();
        handle_event(&pool, &paid).await.unwrap();
        let replay = event(
            "evt_2",
            "checkout.session.async_payment_succeeded",
            "cs_test_1",
            true,
        );
        handle_event(&pool, &replay).await.unwrap();

        assert_eq!(balance(&pool, user).await, 2_100);
        let p = get(&pool, user, payment).await.unwrap();
        assert_eq!(p.status, "completed");
        let deposits: i64 = sqlx::query_scalar(
            "SELECT count(*) FROM transactions WHERE user_id = $1 AND type = 'deposit' AND reference_id = $2",
        )
        .bind(user)
        .bind(payment)
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(deposits, 1);
    }

    #[sqlx::test]
    async fn paiement_non_paye_ou_echoue_ne_credite_pas(pool: PgPool) {
        let user = create_user(&pool, 100).await;
        let payment = pending_payment(&pool, user, "cs_test_2").await;

        handle_event(
            &pool,
            &event("evt_3", "checkout.session.completed", "cs_test_2", false),
        )
        .await
        .unwrap();
        assert_eq!(get(&pool, user, payment).await.unwrap().status, "pending");

        handle_event(
            &pool,
            &event(
                "evt_4",
                "checkout.session.async_payment_failed",
                "cs_test_2",
                false,
            ),
        )
        .await
        .unwrap();
        let p = get(&pool, user, payment).await.unwrap();
        assert_eq!(p.status, "failed");
        assert!(p.failure_reason.is_some());
        assert_eq!(balance(&pool, user).await, 100);
    }

    #[sqlx::test]
    async fn un_joueur_ne_voit_pas_le_paiement_d_un_autre(pool: PgPool) {
        let owner = create_user(&pool, 0).await;
        let other = create_user(&pool, 0).await;
        let payment = pending_payment(&pool, owner, "cs_test_3").await;
        assert!(matches!(
            get(&pool, other, payment).await,
            Err(AppError::NotFound(_))
        ));
    }
}
