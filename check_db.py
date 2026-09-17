import sqlite3

conn = sqlite3.connect('startups.db')
cur = conn.cursor()

# List all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("Tables:", tables)

for table in tables:
    tname = table[0]
    cur.execute(f"SELECT COUNT(*) FROM {tname}")
    count = cur.fetchone()[0]
    print(f"\nTable '{tname}': {count} rows")
    if count > 0:
        cur.execute(f"SELECT * FROM {tname} LIMIT 5")
        rows = cur.fetchall()
        for row in rows:
            print(" ", row)

conn.close()
