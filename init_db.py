import sqlite3

conn = sqlite3.connect("spare_parts.db")
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
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(part_id) REFERENCES parts(id)
)
""")

conn.commit()
conn.close()

print("Database created!")