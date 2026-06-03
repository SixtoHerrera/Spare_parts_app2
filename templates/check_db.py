import sqlite3

conn = sqlite3.connect("spare_parts.db")
cursor = conn.cursor()

print("PARTS:")
for row in cursor.execute("SELECT * FROM parts"):
    print(row)

print("\nTRANSACTIONS:")
for row in cursor.execute("SELECT * FROM transactions"):
    print(row)

conn.close()