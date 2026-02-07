-- Canonical registry of arbitrable symbols per venue/dex
CREATE TABLE IF NOT EXISTS arbitrable_symbols (
    symbol TEXT NOT NULL,
    venue TEXT NOT NULL,
    dex_name TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMPTZ NOT NULL,
    source TEXT,
    PRIMARY KEY (symbol, venue, dex_name)
);

CREATE INDEX IF NOT EXISTS arbitrable_symbols_last_seen
    ON arbitrable_symbols(last_seen DESC);

CREATE INDEX IF NOT EXISTS arbitrable_symbols_active
    ON arbitrable_symbols(is_active, last_seen DESC);
