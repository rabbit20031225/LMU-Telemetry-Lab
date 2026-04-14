import duckdb
import os

db_path = r'C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
con = duckdb.connect(db_path, read_only=True)

tables = [t[0] for t in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

print("--- All Table Counts ---")
counts = {}
for t in tables:
    try:
        count = con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
        counts[t] = count
    except:
        pass

# Group by count
by_count = {}
for t, c in counts.items():
    if c not in by_count: by_count[c] = []
    by_count[c].append(t)

for count in sorted(by_count.keys(), reverse=True):
    print(f"Count {count}: {by_count[count][:10]} {'...' if len(by_count[count]) > 10 else ''}")
