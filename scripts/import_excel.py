import sys, os, sqlite3

try:
    import openpyxl
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl', '-q'])
    import openpyxl

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(SCRIPT_DIR, '..', '..', 'Ledger DCA BTC.xlsx')
DB_PATH    = os.path.join(SCRIPT_DIR, '..', 'data', 'dca.db')

wb = openpyxl.load_workbook(EXCEL_PATH)
ws = wb['Sheet1']

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
con = sqlite3.connect(DB_PATH)
cur = con.cursor()

cur.executescript("""
CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT    NOT NULL UNIQUE,
  fiat_thb   INTEGER NOT NULL CHECK (fiat_thb > 0),
  satoshi    INTEGER NOT NULL CHECK (satoshi  > 0),
  price_thb  REAL    NOT NULL CHECK (price_thb > 0),
  created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings (key, value) VALUES ('goal_fiat', '200000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('goal_satoshi', '2000000');
""")

inserted = 0
skipped_zero = 0
skipped_dup = 0

# Data rows start at row 15 (1-indexed). Header is row 14.
# Columns: A=DayActive, B=Date, C=Fiat, D=Satoshi, E=Price
for row in ws.iter_rows(min_row=15, values_only=True):
    date_val, fiat_val, sat_val, price_val = row[1], row[2], row[3], row[4]

    if not date_val or not isinstance(fiat_val, (int, float)) or fiat_val <= 0:
        skipped_zero += 1
        continue

    date_str = date_val.strftime('%Y-%m-%d') if hasattr(date_val, 'strftime') else str(date_val)[:10]
    fiat_int = int(fiat_val)
    sat_int  = int(sat_val)
    price_f  = float(price_val)

    try:
        cur.execute(
            "INSERT INTO entries (date, fiat_thb, satoshi, price_thb) VALUES (?, ?, ?, ?)",
            (date_str, fiat_int, sat_int, price_f),
        )
        inserted += 1
    except sqlite3.IntegrityError:
        skipped_dup += 1

con.commit()
con.close()

print(f"Done. Inserted: {inserted}  Skipped (zero-fiat): {skipped_zero}  Skipped (duplicate): {skipped_dup}")
