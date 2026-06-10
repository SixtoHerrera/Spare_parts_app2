import sqlite3
from pathlib import Path

DB_PATH = Path(r"S:\SUNDATA\Manufacturing Engineering\Maintenance\Spare parts management\spare_parts.db")
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY,
    part_number TEXT,
    description TEXT,
    category TEXT,
    location TEXT,
    min_stock INTEGER,
    max_stock INTEGER,
    current_stock INTEGER
)
""")
cursor.execute("""
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    part_id INTEGER,
    change INTEGER,
    type TEXT,
    user TEXT DEFAULT 'UNKNOWN',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(part_id) REFERENCES parts(id)
)
""")

cursor.execute("PRAGMA table_info(transactions)")
columns = [column[1] for column in cursor.fetchall()]

if "user" not in columns:
    cursor.execute("ALTER TABLE transactions ADD COLUMN user TEXT DEFAULT 'UNKNOWN'")

conn.commit()
conn.close()

print("Database created!")
