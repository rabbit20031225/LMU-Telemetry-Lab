import duckdb
import pandas as pd

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

def dump_table(name):
    print(f"\n--- TABLE: {name} ---")
    try:
        # Get column names
        cols = [c[0] for c in con.execute(f"DESCRIBE \"{name}\"").fetchall()]
        print(f"Columns: {cols}")
        
        # Get sample
        data = con.execute(f"SELECT * FROM \"{name}\" LIMIT 10").fetchall()
        print("Sample Rows:")
        for row in data:
            print(row)
            
        # Get count
        count = con.execute(f"SELECT COUNT(*) FROM \"{name}\"").fetchone()[0]
        print(f"Total rows: {count}")
    except Exception as e:
        print(f"Error reading {name}: {e}")

dump_table("Path Lateral")
dump_table("Track Edge")
dump_table("GPS Time")

con.close()
