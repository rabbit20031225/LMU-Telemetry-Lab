import duckdb
import os
import json
import sys

db_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
target_key = "CarSetup"
nested_key = "VM_STEER_LOCK"

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

all_results = {}

files = [f for f in os.listdir(db_dir) if f.endswith(".duckdb")]
for filename in files:
    db_path = os.path.join(db_dir, filename)
    try:
        con = duckdb.connect(db_path)
        # Handle table and column name with double quotes for DuckDB
        query = 'SELECT "value" FROM "metadata" WHERE "key" = \'CarSetup\''
        result = con.execute(query).fetchone()
        if result:
            car_setup = json.loads(result[0])
            if nested_key in car_setup:
                all_results[filename] = car_setup[nested_key]
        con.close()
    except Exception as e:
        # sys.stderr.write(f"Error processing {filename}: {e}\n")
        pass

print(json.dumps(all_results, indent=4, ensure_ascii=False))
