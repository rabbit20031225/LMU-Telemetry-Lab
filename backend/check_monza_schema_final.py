import duckdb

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

print("--- TABLES AND COLUMNS ---")
tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
for t in tables:
    cols = [c[1] for c in con.execute(f"PRAGMA table_info(\"{t}\")").fetchall()]
    print(f"Table: {t:25} | Columns: {cols}")

print("\n--- SAMPLE DATA FROM PATH LATERAL ---")
if "Path Lateral" in tables:
    data = con.execute('SELECT * FROM "Path Lateral" LIMIT 5').fetchall()
    for d in data: print(d)

print("\n--- SAMPLE DATA FROM TRACK EDGE ---")
if "Track Edge" in tables:
    data = con.execute('SELECT * FROM "Track Edge" LIMIT 5').fetchall()
    for d in data: print(d)

print("\n--- SAMPLE DATA FROM GPS TIME ---")
if "GPS Time" in tables:
    data = con.execute('SELECT * FROM "GPS Time" LIMIT 5').fetchall()
    for d in data: print(d)

con.close()
