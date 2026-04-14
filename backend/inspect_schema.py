import duckdb
import os

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'

with duckdb.connect(DB_PATH, read_only=True) as con:
    for table in ["Lap", "GPS Time"]:
        try:
            print(f"\nSchema for '{table}':")
            print(con.execute(f"DESCRIBE \"{table}\"").df())
        except Exception as e:
            print(f"Error describing {table}: {e}")
