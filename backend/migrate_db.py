import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "vaaris.db")
print("Opening database:", db_path)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(trusted_heirs)")
cols = [col[1] for col in cursor.fetchall()]
print("Existing columns in trusted_heirs:", cols)

if "public_key" not in cols:
    print("Adding public_key column to trusted_heirs...")
    cursor.execute("ALTER TABLE trusted_heirs ADD COLUMN public_key TEXT")
    conn.commit()
    print("SUCCESS: Added public_key column!")
else:
    print("public_key column already exists.")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [t[0] for t in cursor.fetchall()]
print("All tables in db:", tables)

conn.close()
print("Migration completed!")
