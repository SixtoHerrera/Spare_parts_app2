import sqlite3

conn = sqlite3.connect("spare_parts.db")
cursor = conn.cursor()

print("PARTS:")
for row in cursor.execute("SELECT * FROM parts"):
    print(row)

print("\nTRANSACTIONS:")
for row in cursor.execute("SELECT * FROM transactions"):
    print(row)

# ✅ ADD THIS
print("\nTRANSACTIONS TABLE STRUCTURE:")
for row in cursor.execute("PRAGMA table_info(transactions)"):
    print(row)

conn.close()