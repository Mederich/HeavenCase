-- Dépôt par carte (HENC-20) : un paiement Stripe Checkout crédite un pack.

ALTER TABLE payments
    ADD COLUMN credits         BIGINT      CHECK (credits > 0),
    ADD COLUMN currency        TEXT        NOT NULL DEFAULT 'eur',
    ADD COLUMN completed_at    TIMESTAMPTZ,
    ADD COLUMN failure_reason  TEXT;

-- Un webhook rejoué ne doit traiter qu'une fois chaque événement Stripe.
CREATE TABLE payment_events (
    event_id     TEXT        PRIMARY KEY,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
