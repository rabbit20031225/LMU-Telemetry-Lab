import duckdb
import os
import json

db_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'

for filename in os.listdir(db_dir):
    if filename.endswith(".duckdb"):
        db_path = os.path.join(db_dir, filename)
        try:
            con = duckdb.connect(db_path)
            query = "SELECT value FROM \"metadata\" WHERE key = 'CarSetup'"
            result = con.execute(query).fetchone()
            if result:
                car_setup = json.loads(result[0])
                if "VM_STEER_LOCK" in car_setup:
                    print(f"\n--- {filename} ---")
                    print(json.dumps({"VM_STEER_LOCK": car_setup["VM_STEER_LOCK"]}, indent=4))
            con.close()
        except Exception as e:
            # print(f"Error processing {filename}: {e}")
            pass
