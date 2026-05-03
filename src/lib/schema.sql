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
  ('goal_satoshi',  '2000000');
