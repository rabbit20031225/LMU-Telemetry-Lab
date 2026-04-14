
import duckdb
import os

db_path = 'DuckDB_data/Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
con = duckdb.connect(db_path, read_only=True)

print("--- Lap Dist min/max ---")
print(con.execute("SELECT min(value), max(value) FROM \"Lap Dist\"").fetchall())

print("--- Ground Speed min/max ---")
print(con.execute("SELECT min(value), max(value) FROM \"Ground Speed\"").fetchall())

print("--- GPS Speed min/max ---")
print(con.execute("SELECT min(value), max(value) FROM \"GPS Speed\"").fetchall())

con.close()
