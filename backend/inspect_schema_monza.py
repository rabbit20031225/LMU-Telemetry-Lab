import duckdb

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

# 1. Show all tables
tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
print("Tables:", tables)

# 2. Describe Path Lateral
if "Path Lateral" in tables:
    print("\nSchema for Path Lateral:")
    print(con.execute('DESCRIBE "Path Lateral"').fetchall())
    print("\nSample for Path Lateral:")
    print(con.execute('SELECT * FROM "Path Lateral" LIMIT 5').fetchall())

# 3. Describe Track Edge
if "Track Edge" in tables:
    print("\nSchema for Track Edge:")
    print(con.execute('DESCRIBE "Track Edge"').fetchall())
    print("\nSample for Track Edge:")
    print(con.execute('SELECT * FROM "Track Edge" LIMIT 5').fetchall())

con.close()
