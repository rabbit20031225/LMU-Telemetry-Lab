import duckdb
import os
import json

db_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
target_key = "VM_STEER_LOCK"

for filename in os.listdir(db_dir):
    if filename.endswith(".duckdb"):
        db_path = os.path.join(db_dir, filename)
        try:
            con = duckdb.connect(db_path)
            # Try to find the key in the metadata table
            query = f"SELECT value FROM \"metadata\" WHERE key = '{target_key}'"
            result = con.execute(query).fetchone()
            
            if result:
                print(f"--- {filename} ---")
                print(f"\"{target_key}\": {result[0]}")
            else:
                # Also check if it's nested in some JSON in other keys
                # (Though usually it's a top-level key in the metadata table based on common patterns)
                pass
            con.close()
        except Exception as e:
            # print(f"Error processing {filename}: {e}")
            pass
