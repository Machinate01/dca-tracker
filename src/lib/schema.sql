CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT    NOT NULL UNIQUE,
  fiat_thb   INTEGER NOT NULL CHECK (fiat_thb > 0),
  satoshi    INTEGER NOT NULL CHECK (satoshi  > 0),
  price_thb  REAL    NOT NULL CHECK (price_thb > 0),
  created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('goal_fiat',     '200000'),
  ('goal_satoshi',  '2000000'),
  ('usd_thb',       '32.70');

CREATE TABLE IF NOT EXISTS transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT    NOT NULL,
  type       TEXT    NOT NULL CHECK (type IN ('buy','sell')),
  shares     REAL    NOT NULL CHECK (shares > 0),
  price_usd  REAL    NOT NULL CHECK (price_usd > 0),
  date       TEXT    NOT NULL DEFAULT (date('now')),
  created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tx_ticker ON transactions(ticker);

CREATE TABLE IF NOT EXISTS holdings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker     TEXT    NOT NULL UNIQUE,
  shares     REAL    NOT NULL CHECK (shares > 0),
  cost_usd   REAL    NOT NULL CHECK (cost_usd > 0),
  price_usd  REAL    NOT NULL CHECK (price_usd > 0),
  updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO holdings (ticker, shares, cost_usd, price_usd) VALUES
  ('VOO',   0.7561295, 468.43, 660.12),
  ('V',     0.9430122, 296.88, 326.85),
  ('LLY',   0.2135748, 203.24, 967.93),
  ('TSM',   0.4229567, 144.71, 401.61),
  ('GOOGL', 0.2653297,  79.68, 383.25),
  ('NVDA',  0.6207661, 119.80, 198.54),
  ('XE',    4.0,       130.80,  29.76),
  ('MSFT',  0.1383175,  57.83, 413.62);
