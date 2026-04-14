import duckdb
import os

db_path = r'C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
con = duckdb.connect(db_path, read_only=True)

print("--- GPS Time Sample ---")
print(con.execute('SELECT value FROM "GPS Time" LIMIT 5').df())

print("\n--- Lap Sample ---")
print(con.execute('SELECT ts, value FROM "Lap" LIMIT 5').df())

print("\n--- Min/Max Comparison ---")
time_min = con.execute('SELECT MIN(value) FROM "GPS Time"').fetchone()[0]
time_max = con.execute('SELECT MAX(value) FROM "GPS Time"').fetchone()[0]
lap_min = con.execute('SELECT MIN(ts) FROM "Lap"').fetchone()[0]
lap_max = con.execute('SELECT MAX(ts) FROM "Lap"').fetchone()[0]

print(f"GPS Time Range: {time_min} to {time_max}")
print(f"Lap TS Range:   {lap_min} to {lap_max}")
