print("APP STARTED")
from flask import Flask, request, jsonify, render_template, session
import sqlite3

app = Flask(__name__)
app.secret_key = "supersecretkey"

# --------------------------------------
# Database connection (with timeout)
# --------------------------------------
def get_db():
    return sqlite3.connect("spare_parts.db", timeout=10)


# --------------------------------------
# HOME (UI)
# --------------------------------------
@app.route("/")
def home():
    return render_template("index.html")


# --------------------------------------
# GET ALL PARTS
# --------------------------------------
@app.route("/parts", methods=["GET"])
def get_parts():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM parts")
    rows = cursor.fetchall()

    conn.close()
    return jsonify(rows)


# --------------------------------------
# ADD NEW PART
# --------------------------------------
@app.route("/parts", methods=["POST"])
def add_part():
    print("ADD PART HIT")

    data = request.json

    if not data:
        return jsonify({"message": "Invalid data"}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO parts (
                part_number,
                description,
                category,
                location,
                min_stock,
                max_stock,
                current_stock
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data["part_number"],
            data["description"],
            data["category"],
            data["location"],
            data["min_stock"],
            data["max_stock"],
            data["current_stock"]
        ))

        conn.commit()
        conn.close()

        return jsonify({"message": "Part added successfully"})

    except Exception as e:
        return jsonify({"message": str(e)}), 500


# --------------------------------------
# UPDATE STOCK + TRANSACTION LOG
# --------------------------------------
@app.route("/update_stock", methods=["POST"])
def update_stock():
    data = request.json

    part_id = data["part_id"]
    change = data["change"]
    user = session.get("user", "UNKNOWN")

    conn = get_db()
    cursor = conn.cursor()

    # Get current stock
    cursor.execute("SELECT current_stock FROM parts WHERE id = ?", (part_id,))
    result = cursor.fetchone()

    if result is None:
        conn.close()
        return jsonify({"message": "Part not found"}), 404

    current_stock = result[0]
    new_stock = current_stock + change

    # Prevent negative stock
    if new_stock < 0:
        conn.close()
        return jsonify({"message": "Error: Not enough stock!"}), 400

    # Update stock
    cursor.execute("""
        UPDATE parts
        SET current_stock = ?
        WHERE id = ?
    """, (new_stock, part_id))

    # Determine type
    transaction_type = "IN" if change > 0 else "OUT"

    # Insert transaction
    cursor.execute("""
        INSERT INTO transactions (part_id, change, type, user)
        VALUES (?, ?, ?, ?)
    """, (part_id, abs(change), transaction_type, user))

    conn.commit()
    conn.close()

    return jsonify({"message": "Stock updated"})


# --------------------------------------
# GET TRANSACTION HISTORY
# --------------------------------------
@app.route("/transactions", methods=["GET"])
def get_transactions():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT t.id, p.part_number, t.type, t.change, t.user, t.date
        FROM transactions t
        JOIN parts p ON t.part_id = p.id
        ORDER BY t.date DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return jsonify(rows)
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    session["user"] = data.get("username")
    return jsonify({"message": "Logged in"})
# --------------------------------------
# RUN SERVER
# --------------------------------------
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)