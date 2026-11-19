//! Accès réservé aux majeurs (HENC-35) et acceptation des CGU (HENC-36).
//!
//! L'âge est calculé ici, côté serveur, à partir de la date complète. Un
//! compte n'est actif que s'il a déclaré 18 ans ou plus et accepté la
//! version courante des CGU ; les routes sensibles appellent [`ensure`].

use serde::Serialize;
use sqlx::{PgConnection, PgPool};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::errors::AppError;

pub const MIN_AGE: i32 = 18;

pub const UNDERAGE_MESSAGE: &str = "HeavenCases est réservé aux personnes majeures : il faut avoir 18 ans ou plus pour créer un compte.";

/// Date du calendrier grégorien, sans fuseau.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Date {
    pub year: i32,
    pub month: u32,
    pub day: u32,
}

impl Date {
    /// Lit une date `AAAA-MM-JJ` en refusant les jours qui n'existent pas.
    pub fn parse(value: &str) -> Option<Self> {
        let mut parts = value.trim().splitn(3, '-');
        let year: i32 = parts.next()?.parse().ok()?;
        let month: u32 = parts.next()?.parse().ok()?;
        let day: u32 = parts.next()?.parse().ok()?;
        if !(1900..=9999).contains(&year) || !(1..=12).contains(&month) {
            return None;
        }
        if day == 0 || day > days_in_month(year, month) {
            return None;
        }
        Some(Self { year, month, day })
    }

    pub fn to_iso(self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }
}

fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

/// Âge en années révolues à la date `today`.
pub fn age(birth: Date, today: Date) -> i32 {
    let mut years = today.year - birth.year;
    if (today.month, today.day) < (birth.month, birth.day) {
        years -= 1;
    }
    years
}

/// Contrôle une date de naissance déclarée : renvoie la date si le joueur est majeur.
pub fn check_birth_date(value: Option<&str>, today: Date) -> Result<Date, AppError> {
    let value = value
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .ok_or_else(|| AppError::BadRequest("Renseigne ta date de naissance".into()))?;
    let birth = Date::parse(value)
        .ok_or_else(|| AppError::BadRequest("Date de naissance invalide".into()))?;
    if birth > today {
        return Err(AppError::BadRequest(
            "La date de naissance ne peut pas être dans le futur".into(),
        ));
    }
    if age(birth, today) < MIN_AGE {
        return Err(AppError::Forbidden(UNDERAGE_MESSAGE.into()));
    }
    Ok(birth)
}

/// Date du jour selon la base (UTC).
pub async fn today(conn: &mut PgConnection) -> Result<Date, AppError> {
    let iso: String = sqlx::query_scalar("SELECT to_char(current_date, 'YYYY-MM-DD')")
        .fetch_one(conn)
        .await?;
    Date::parse(&iso).ok_or_else(|| AppError::Internal(format!("date du jour illisible : {iso}")))
}

/// Version des CGU à accepter (la dernière publiée).
pub async fn current_terms_version(conn: &mut PgConnection) -> Result<String, sqlx::Error> {
    sqlx::query_scalar("SELECT version FROM terms_versions ORDER BY published_at DESC LIMIT 1")
        .fetch_one(conn)
        .await
}

/// Enregistre l'acceptation de la version courante ; sans effet si elle l'est déjà.
pub async fn accept_terms(conn: &mut PgConnection, user_id: Uuid) -> Result<String, sqlx::Error> {
    let version = current_terms_version(&mut *conn).await?;
    sqlx::query(
        "INSERT INTO terms_acceptances (user_id, version) VALUES ($1, $2)
         ON CONFLICT (user_id, version) DO NOTHING",
    )
    .bind(user_id)
    .bind(&version)
    .execute(conn)
    .await?;
    Ok(version)
}

/// Où en est le compte dans les contrôles d'activation.
#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
pub struct Eligibility {
    /// Date de naissance déclarée, `AAAA-MM-JJ`.
    pub birth_date: Option<String>,
    /// 18 ans ou plus déclarés.
    pub age_verified: bool,
    /// Version courante des CGU acceptée.
    pub terms_accepted: bool,
    /// Version courante des CGU.
    pub terms_version: String,
}

pub async fn status(conn: &mut PgConnection, user_id: Uuid) -> Result<Eligibility, sqlx::Error> {
    sqlx::query_as(
        "WITH current AS (
             SELECT version FROM terms_versions ORDER BY published_at DESC LIMIT 1
         )
         SELECT to_char(u.birth_date, 'YYYY-MM-DD') AS birth_date,
                u.age_verified_at IS NOT NULL AS age_verified,
                EXISTS (SELECT 1 FROM terms_acceptances a
                        WHERE a.user_id = u.id AND a.version = current.version) AS terms_accepted,
                current.version AS terms_version
         FROM users u, current
         WHERE u.id = $1",
    )
    .bind(user_id)
    .fetch_one(conn)
    .await
}

/// Refuse l'action si le compte n'est pas actif (âge ou CGU manquants).
pub async fn ensure(conn: &mut PgConnection, user_id: Uuid) -> Result<(), AppError> {
    let status = status(conn, user_id).await?;
    if !status.age_verified {
        return Err(AppError::Forbidden(
            "Renseigne ta date de naissance pour activer ton compte".into(),
        ));
    }
    if !status.terms_accepted {
        return Err(AppError::Forbidden(
            "Accepte les conditions générales d'utilisation pour continuer".into(),
        ));
    }
    Ok(())
}

/// Complète un compte existant : date de naissance (si absente) et CGU.
///
/// Une date déjà déclarée ne peut pas être remplacée, sinon le contrôle
/// serait contournable en réessayant avec une autre date.
pub async fn complete(
    pool: &PgPool,
    user_id: Uuid,
    birth_date: Option<&str>,
    accept: bool,
) -> Result<Eligibility, AppError> {
    let mut tx = pool.begin().await?;
    sqlx::query("SELECT 1 FROM users WHERE id = $1 FOR UPDATE")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;
    let current = status(&mut tx, user_id).await?;

    if current.birth_date.is_none() {
        let today = today(&mut tx).await?;
        match check_birth_date(birth_date, today) {
            Ok(birth) => {
                sqlx::query(
                    "UPDATE users SET birth_date = $2::date, age_verified_at = now() WHERE id = $1",
                )
                .bind(user_id)
                .bind(birth.to_iso())
                .execute(&mut *tx)
                .await?;
            }
            Err(AppError::Forbidden(msg)) => {
                // Mineur : la déclaration reste associée au compte, qui reste inactif.
                let declared = Date::parse(birth_date.unwrap_or_default()).map(Date::to_iso);
                sqlx::query("UPDATE users SET birth_date = $2::date WHERE id = $1")
                    .bind(user_id)
                    .bind(declared)
                    .execute(&mut *tx)
                    .await?;
                tx.commit().await?;
                return Err(AppError::Forbidden(msg));
            }
            Err(e) => return Err(e),
        }
    } else if !current.age_verified {
        return Err(AppError::Forbidden(UNDERAGE_MESSAGE.into()));
    }

    if !current.terms_accepted {
        if !accept {
            return Err(AppError::BadRequest(
                "Accepte les conditions générales d'utilisation pour continuer".into(),
            ));
        }
        accept_terms(&mut tx, user_id).await?;
    }

    let updated = status(&mut tx, user_id).await?;
    tx.commit().await?;
    Ok(updated)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;

    fn d(year: i32, month: u32, day: u32) -> Date {
        Date { year, month, day }
    }

    #[test]
    fn lit_les_dates_valides_seulement() {
        assert_eq!(Date::parse("2000-02-29"), Some(d(2000, 2, 29)));
        assert_eq!(Date::parse("1900-02-29"), None);
        assert_eq!(Date::parse("2001-02-29"), None);
        assert_eq!(Date::parse("2001-04-31"), None);
        assert_eq!(Date::parse("2001-13-01"), None);
        assert_eq!(Date::parse("19/11/2001"), None);
        assert_eq!(Date::parse(""), None);
    }

    #[test]
    fn age_tient_compte_du_jour_et_du_mois() {
        let today = d(2026, 11, 20);
        assert_eq!(age(d(2008, 11, 20), today), 18);
        assert_eq!(age(d(2008, 11, 21), today), 17);
        assert_eq!(age(d(2008, 12, 1), today), 17);
        assert_eq!(age(d(2008, 10, 31), today), 18);
        // Né un 29 février : majeur le 1er mars de l'année de ses 18 ans.
        assert_eq!(age(d(2008, 2, 29), d(2026, 2, 28)), 17);
        assert_eq!(age(d(2008, 2, 29), d(2026, 3, 1)), 18);
    }

    #[test]
    fn controle_de_la_date_declaree() {
        let today = d(2026, 11, 20);
        assert!(check_birth_date(Some("2008-11-20"), today).is_ok());
        assert!(matches!(
            check_birth_date(Some("2008-11-21"), today),
            Err(AppError::Forbidden(_))
        ));
        assert!(matches!(
            check_birth_date(None, today),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            check_birth_date(Some("2027-01-01"), today),
            Err(AppError::BadRequest(_))
        ));
        assert!(matches!(
            check_birth_date(Some("pas une date"), today),
            Err(AppError::BadRequest(_))
        ));
    }

    async fn new_account(pool: &PgPool) -> Uuid {
        let id = Uuid::new_v4();
        sqlx::query(
            "INSERT INTO users (id, username, email, password_hash, email_verified_at)
             VALUES ($1, 'sso', $2, 'hash', now())",
        )
        .bind(id)
        .bind(format!("{id}@test.local"))
        .execute(pool)
        .await
        .unwrap();
        id
    }

    #[sqlx::test]
    async fn compte_sans_controle_est_inactif(pool: PgPool) {
        let user = new_account(&pool).await;
        let mut conn = pool.acquire().await.unwrap();
        let s = status(&mut conn, user).await.unwrap();
        assert!(!s.age_verified && !s.terms_accepted && s.birth_date.is_none());
        assert!(matches!(
            ensure(&mut conn, user).await,
            Err(AppError::Forbidden(_))
        ));
    }

    #[sqlx::test]
    async fn completer_active_le_compte(pool: PgPool) {
        let user = new_account(&pool).await;
        assert!(matches!(
            complete(&pool, user, Some("1995-06-15"), false).await,
            Err(AppError::BadRequest(_))
        ));
        let s = complete(&pool, user, Some("1995-06-15"), true)
            .await
            .unwrap();
        assert!(s.age_verified && s.terms_accepted);
        assert_eq!(s.birth_date.as_deref(), Some("1995-06-15"));
        let mut conn = pool.acquire().await.unwrap();
        assert!(ensure(&mut conn, user).await.is_ok());
    }

    #[sqlx::test]
    async fn mineur_reste_inactif_sans_pouvoir_changer_sa_date(pool: PgPool) {
        let user = new_account(&pool).await;
        let mut conn = pool.acquire().await.unwrap();
        let today = today(&mut conn).await.unwrap();
        let minor = Date {
            year: today.year - 10,
            month: 1,
            day: 1,
        };

        assert!(matches!(
            complete(&pool, user, Some(&minor.to_iso()), true).await,
            Err(AppError::Forbidden(_))
        ));
        assert!(matches!(
            complete(&pool, user, Some("1990-01-01"), true).await,
            Err(AppError::Forbidden(_))
        ));
        let s = status(&mut conn, user).await.unwrap();
        assert!(!s.age_verified);
        assert_eq!(s.birth_date, Some(minor.to_iso()));
    }

    #[sqlx::test]
    async fn nouvelle_version_des_cgu_a_accepter(pool: PgPool) {
        let user = new_account(&pool).await;
        complete(&pool, user, Some("1990-01-01"), true)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO terms_versions (version, published_at) VALUES ('v2', now() + interval '1 day')",
        )
        .execute(&pool)
        .await
        .unwrap();

        let mut conn = pool.acquire().await.unwrap();
        let s = status(&mut conn, user).await.unwrap();
        assert!(s.age_verified && !s.terms_accepted);
        assert_eq!(s.terms_version, "v2");

        let s = complete(&pool, user, None, true).await.unwrap();
        assert!(s.terms_accepted);
    }
}
