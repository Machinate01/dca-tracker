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
  ('VOO',   0.756129,  469.755877, 588.672),
  ('V',     0.79772,   248.946924, 298.8),
  ('LLY',   0.213575,  204.208361, 934.74),
  ('TSM',   0.422956,  145.243938, 392.12),
  ('GOOGL', 0.26533,    79.372685, 304.018),
  ('NVDA',  0.620766,  120.0,      209.722),
  ('XE',    4.0,       131.01,      32.7),
  ('MSFT',  0.138318,   57.92,     418.09);

INSERT OR IGNORE INTO transactions (id, ticker, type, shares, price_usd, date) VALUES
  -- V
  (1,  'V',     'buy', 0.121015,  330.042,  '2025-11-24'),
  (2,  'V',     'buy', 0.12089,   330.384,  '2025-11-24'),
  (3,  'V',     'buy', 0.151612,  314.42,   '2026-02-17'),
  (4,  'V',     'buy', 0.149384,  305.79,   '2026-03-25'),
  (5,  'V',     'buy', 0.254819,  298.8,    '2026-03-31'),
  -- TSM
  (6,  'TSM',   'buy', 0.11182,   274.996,  '2025-11-18'),
  (7,  'TSM',   'buy', 0.156235,  340.64,   '2026-03-12'),
  (8,  'TSM',   'buy', 0.058604,  392.12,   '2026-04-28'),
  (9,  'TSM',   'buy', 0.096297,  392.12,   '2026-04-28'),
  -- LLY
  (10, 'LLY',   'buy', 0.055045,  953.588,  '2025-11-06'),
  (11, 'LLY',   'buy', 0.015727,  990.616,  '2025-12-08'),
  (12, 'LLY',   'buy', 0.097143,  952.104,  '2026-03-17'),
  (13, 'LLY',   'buy', 0.04566,   934.74,   '2026-04-14'),
  -- GOOGL
  (14, 'GOOGL', 'buy', 0.156948,  297.742,  '2026-03-06'),
  (15, 'GOOGL', 'buy', 0.108382,  304.018,  '2026-03-16'),
  -- NVDA
  (16, 'NVDA',  'buy', 0.33515,   178.726,  '2025-11-24'),
  (17, 'NVDA',  'buy', 0.285616,  209.722,  '2025-11-24'),
  -- XE
  (18, 'XE',    'buy', 4.0,        32.7,    '2026-04-27'),
  -- MSFT
  (19, 'MSFT',  'buy', 0.138318,  418.09,   '2026-04-27'),
  -- VOO
  (20, 'VOO',   'buy', 0.061485,  628.122,  '2025-12-15'),
  (21, 'VOO',   'buy', 0.034834,  632.714,  '2025-12-29'),
  (22, 'VOO',   'buy', 0.074948,  631.774,  '2025-12-30'),
  (23, 'VOO',   'buy', 0.074951,  629.346,  '2025-12-31'),
  (24, 'VOO',   'buy', 0.074633,  635.508,  '2026-01-14'),
  (25, 'VOO',   'buy', 0.07542,   629.14,   '2026-02-06'),
  (26, 'VOO',   'buy', 0.075706,  617.254,  '2026-03-06'),
  (27, 'VOO',   'buy', 0.074995,  615.244,  '2026-03-16'),
  (28, 'VOO',   'buy', 0.079815,  618.426,  '2026-03-17'),
  (29, 'VOO',   'buy', 0.129342,  588.672,  '2026-03-31');
