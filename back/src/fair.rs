//! Moteur de tirage « provably fair ».
//!
//! Algorithme (reproductible par n'importe qui une fois la server seed révélée) :
//!
//! 1. `digest = HMAC-SHA256(clé = server_seed, message = "{client_seed}:{nonce}")`
//! 2. `ticket = (8 premiers octets du digest, lus en big-endian comme u64) % 100 000`,
//!    à condition que ces 8 octets soient sous [`REJECTION_LIMIT`] ; sinon on prend les
//!    8 octets suivants, et si les 4 blocs sont rejetés, on recommence avec le message
//!    `"{client_seed}:{nonce}:{round}"` (round = 1, 2…). Aucun ticket n'est ainsi favorisé
//!    par le modulo, et le cas de rejet (environ 1 sur 3,6 × 10^14) ne change aucun ticket
//!    déjà tiré.
//! 3. L'objet gagné est celui dont la plage `[roll_min, roll_max]` contient le
//!    ticket, les plages étant attribuées dans l'ordre canonique de
//!    [`crate::catalog::loot_table`].
//!
//! Avant l'ouverture, seul `SHA-256(server_seed)` est communiqué au joueur.

use hmac::{Hmac, KeyInit, Mac};
use rand_core::{OsRng, RngCore};
use sha2::{Digest, Sha256};

use crate::catalog::{LootEntry, TICKET_RANGE};

/// Nouvelle server seed : 32 octets d'un CSPRNG, encodés en hexadécimal.
pub fn generate_server_seed() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// Empreinte publique d'une server seed (SHA-256, hexadécimal).
pub fn hash_server_seed(server_seed: &str) -> String {
    hex::encode(Sha256::digest(server_seed.as_bytes()))
}

/// Plus grand multiple de [`TICKET_RANGE`] sur 64 bits (exclu). Au-delà, un bloc favoriserait
/// les tickets 0 à 51 615 : il est rejeté.
const REJECTION_LIMIT: u64 = u64::MAX - (u64::MAX % TICKET_RANGE as u64);

/// Ticket entre 0 et 99 999, déterminé par le triplet seeds + nonce.
pub fn roll(server_seed: &str, client_seed: &str, nonce: i32) -> u32 {
    (0u32..)
        .find_map(|round| {
            let mut mac = Hmac::<Sha256>::new_from_slice(server_seed.as_bytes())
                .expect("HMAC accepte une clé de n'importe quelle taille");
            let message = match round {
                0 => format!("{client_seed}:{nonce}"),
                _ => format!("{client_seed}:{nonce}:{round}"),
            };
            mac.update(message.as_bytes());
            let digest: [u8; 32] = mac.finalize().into_bytes().into();
            ticket_from_digest(&digest)
        })
        .expect("un bloc finit toujours par passer sous la limite")
}

/// Premier bloc de 8 octets sous la limite de rejet, ramené à un ticket. `None` si les 4 sont rejetés.
fn ticket_from_digest(digest: &[u8; 32]) -> Option<u32> {
    let (blocks, _) = digest.as_chunks::<8>();
    blocks.iter().find_map(|block| {
        let value = u64::from_be_bytes(*block);
        (value < REJECTION_LIMIT).then(|| (value % u64::from(TICKET_RANGE)) as u32)
    })
}

/// Objet dont la plage contient le ticket.
pub fn pick(table: &[LootEntry], ticket: u32) -> Option<&LootEntry> {
    table
        .iter()
        .find(|e| e.drop_weight > 0 && (e.roll_min..=e.roll_max).contains(&ticket))
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn entry(name: &str, roll_min: u32, roll_max: u32) -> LootEntry {
        let weight = roll_max - roll_min + 1;
        LootEntry {
            item_id: Uuid::new_v4(),
            name: name.into(),
            image_url: None,
            rarity: "common".into(),
            value: 0,
            drop_weight: weight as i32,
            probability: f64::from(weight) / 1_000.0,
            roll_min,
            roll_max,
        }
    }

    #[test]
    fn roll_correspond_au_vecteur_de_reference() {
        // echo -n "client-seed:0" | openssl dgst -sha256 -hmac "server-seed"
        // → e4855fab63cbdebb… ; 0xe4855fab63cbdebb % 100000 = 38203
        assert_eq!(roll("server-seed", "client-seed", 0), 38203);
    }

    // Scénario 3 de HENC-24 : après rotation, la server seed révélée permet de recalculer
    // les 5 ouvertures. Valeurs calculées par un vérificateur Python indépendant (hashlib + hmac).
    #[test]
    fn scenario_3_les_5_ouvertures_se_recalculent_avec_un_verificateur_externe() {
        let seed = "9f29414d93337a5f9968a885dba71e26be3fbc15dce24ff373c664c1e9bed90f";
        assert_eq!(
            hash_server_seed(seed),
            "e725b56abdec7304b771a76daf43be5649db0204d451db4c87bf4428c9541499"
        );
        let tickets: Vec<u32> = (0..5)
            .map(|nonce| roll(seed, "joueur-test", nonce))
            .collect();
        assert_eq!(tickets, [12_367, 70_445, 85_703, 780, 85_488]);
    }

    #[test]
    fn un_bloc_au_dela_de_la_limite_est_rejete_au_profit_du_suivant() {
        let mut digest = [0u8; 32];
        digest[..8].copy_from_slice(&u64::MAX.to_be_bytes());
        digest[8..16].copy_from_slice(&123_456_u64.to_be_bytes());
        assert_eq!(ticket_from_digest(&digest), Some(23_456));
    }

    #[test]
    fn le_dernier_bloc_sous_la_limite_est_accepte() {
        let mut digest = [0xFF; 32];
        digest[..8].copy_from_slice(&(REJECTION_LIMIT - 1).to_be_bytes());
        assert_eq!(ticket_from_digest(&digest), Some(99_999));
    }

    #[test]
    fn un_digest_entierement_au_dela_de_la_limite_ne_donne_aucun_ticket() {
        assert_eq!(ticket_from_digest(&[0xFF; 32]), None);
    }

    #[test]
    fn roll_est_deterministe_et_depend_du_nonce() {
        let a = roll("s", "c", 1);
        assert_eq!(a, roll("s", "c", 1));
        let tickets: std::collections::HashSet<_> = (0..50).map(|n| roll("s", "c", n)).collect();
        assert!(tickets.len() > 45, "le nonce doit faire varier le ticket");
        assert!(tickets.iter().all(|&t| t < TICKET_RANGE));
    }

    #[test]
    fn empreinte_sha256() {
        // echo -n "server-seed" | shasum -a 256
        assert_eq!(
            hash_server_seed("server-seed"),
            "91024ec49c5bec0b689e42892526320fce08337205c91de94c7a588c20d08eeb"
        );
    }

    #[test]
    fn seeds_generees_uniques_et_de_32_octets() {
        let (a, b) = (generate_server_seed(), generate_server_seed());
        assert_eq!(a.len(), 64);
        assert_ne!(a, b);
    }

    // Scénario 2 de HENC-24 : A à 1 % (0 à 999), B à 99 % (1 000 à 99 999).
    #[test]
    fn ticket_452_donne_l_objet_a() {
        let table = [entry("A", 0, 999), entry("B", 1_000, 99_999)];
        assert_eq!(pick(&table, 452).unwrap().name, "A");
        assert_eq!(pick(&table, 999).unwrap().name, "A");
        assert_eq!(pick(&table, 1_000).unwrap().name, "B");
        assert_eq!(pick(&table, 99_999).unwrap().name, "B");
        assert!(pick(&table, 100_000).is_none());
    }

    #[test]
    fn la_repartition_respecte_les_drop_rates() {
        let table = [entry("A", 0, 9_999), entry("B", 10_000, 99_999)];
        let n = 100_000;
        let hits_a = (0..n)
            .filter(|&nonce| pick(&table, roll("seed", "client", nonce)).unwrap().name == "A")
            .count();
        // 10 % attendus : on tolère ±0,5 point sur 100 000 tirages.
        let rate = hits_a as f64 / n as f64;
        assert!((0.095..0.105).contains(&rate), "taux observé {rate}");
    }
}
