//! Moteur de tirage « provably fair ».
//!
//! Algorithme (reproductible par n'importe qui une fois la server seed révélée) :
//!
//! 1. `digest = HMAC-SHA256(clé = server_seed, message = "{client_seed}:{nonce}")`
//! 2. `ticket = (8 premiers octets du digest, lus en big-endian comme u64) % 100 000`
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

/// Ticket entre 0 et 99 999, déterminé par le triplet seeds + nonce.
pub fn roll(server_seed: &str, client_seed: &str, nonce: i32) -> u32 {
    let mut mac = Hmac::<Sha256>::new_from_slice(server_seed.as_bytes())
        .expect("HMAC accepte une clé de n'importe quelle taille");
    mac.update(format!("{client_seed}:{nonce}").as_bytes());
    let digest = mac.finalize().into_bytes();

    let mut head = [0u8; 8];
    head.copy_from_slice(&digest[..8]);
    // Le biais du modulo est négligeable : 2^64 / 100 000 ≈ 1,8 × 10^14.
    (u64::from_be_bytes(head) % u64::from(TICKET_RANGE)) as u32
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
            exterior: None,
            stattrak: false,
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
