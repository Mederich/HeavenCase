-- Vérification de l'âge (HENC-35) et acceptation des CGU (HENC-36).

-- Date de naissance déclarée ; age_verified_at n'est posé que si le joueur a 18 ans ou plus.
ALTER TABLE users
    ADD COLUMN birth_date      DATE,
    ADD COLUMN age_verified_at TIMESTAMPTZ;

-- Versions publiées des CGU : la plus récente est celle à accepter.
CREATE TABLE terms_versions (
    version       TEXT        PRIMARY KEY,
    published_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Preuve d'acceptation : un compte accepte une version donnée une seule fois.
CREATE TABLE terms_acceptances (
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    version      TEXT        NOT NULL REFERENCES terms_versions (version),
    accepted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, version)
);

INSERT INTO terms_versions (version, published_at) VALUES ('2026-11-19', '2026-11-19T00:00:00Z');
