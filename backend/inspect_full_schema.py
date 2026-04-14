import duckdb
import os
import pandas as pd

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'

pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

with duckdb.connect(DB_PATH, read_only=True) as con:
    tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
    print(f"Discovered {len(tables)} tables.")
    
    # Check for specific interesting tables
    for target in ["Lap", "GPS Time", "metadata", "eventsList", "channelsList"]:
        if target in tables:
            print(f"\n--- {target} Schema ---")
            try:
                print(con.execute(f"DESCRIBE \"{target}\"").df())
                print(f"\n--- {target} Head (3 rows) ---")
                print(con.execute(f"SELECT * FROM \"{target}\" LIMIT 3").df())
            except Exception as e:
                print(f"Error reading {target}: {e}")

    # Find ANY table that has 'ts'
    print("\n--- Tables containing 'ts' column ---")
    for t in tables:
        try:
            cols = [c[0] for c in con.execute(f"DESCRIBE \"{t}\"").fetchall()]
            if 'ts' in cols:
                print(f"- {t}")
        except:
            pass
