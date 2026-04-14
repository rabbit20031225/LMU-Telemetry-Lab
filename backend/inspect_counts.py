import duckdb
import os

db_path = r'C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
con = duckdb.connect(db_path, read_only=True)

tables = [t[0] for t in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

print("--- Row Counts ---")
for t in ["GPS Time", "GPS Latitude", "Ground Speed", "Lap Dist", "Lap"]:
    if t in tables:
        count = con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
        print(f"{t}: {count}")
    else:
        print(f"{t}: MISSING")
