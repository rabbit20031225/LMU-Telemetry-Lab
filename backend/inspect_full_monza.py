import duckdb

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]

def full_info(name):
    print(f"\n--- INFO: {name} ---")
    try:
        info = con.execute(f"PRAGMA table_info(\"{name}\")").fetchall()
        for col in info:
            print(col)
            
        sample = con.execute(f"SELECT * FROM \"{name}\" LIMIT 5").fetchall()
        print("Sample:", sample)
    except Exception as e:
        print(f"Error: {e}")

full_info("Path Lateral")
full_info("Track Edge")
full_info("GPS Time")
full_info("metadata")

con.close()
