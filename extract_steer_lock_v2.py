import duckdb
import os
import json
import sys

db_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
target_key = "CarSetup"
nested_key = "VM_STEER_LOCK"

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

for filename in os.listdir(db_dir):
    if filename.endswith(".duckdb"):
        db_path = os.path.join(db_dir, filename)
        try:
            con = duckdb.connect(db_path)
            query = f"SELECT value FROM \"metadata\" WHERE key = '{target_key}'"
            result = con.execute(query).fetchone()
            if result:
                car_setup = json.loads(result[0])
                if nested_key in car_setup:
                    print(f"\n--- {filename} ---")
                    print(json.dumps({nested_key: car_setup[nested_key]}, indent=4, ensure_ascii=False))
            con.close()
        except:
            pass
