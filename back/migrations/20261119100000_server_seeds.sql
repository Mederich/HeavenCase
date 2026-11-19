-- =========================================================
-- Provably fair : server seeds des joueurs (HENC-24)
-- =========================================================
-- Chaque joueur a une seule server seed active (revealed_at IS NULL).
-- Seule son empreinte SHA-256 est exposée tant qu'elle est active ; la seed
-- est révélée en clair quand le joueur la fait tourner, ce qui lui permet de
-- recalculer toutes les ouvertures faites avec elle.
CREATE TABLE server_seeds (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    seed         TEXT        NOT NULL,
    seed_hash    TEXT        NOT NULL UNIQUE,
    -- Prochain nonce à utiliser (0 pour la première ouverture)
    nonce        INT         NOT NULL DEFAULT 0 CHECK (nonce >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    revealed_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX server_seeds_one_active_per_user
    ON server_seeds (user_id) WHERE revealed_at IS NULL;
