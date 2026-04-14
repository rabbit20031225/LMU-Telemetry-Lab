import os
import sys
import json
import duckdb

# Add backend to path for import
sys.path.append(os.path.join(os.getcwd(), 'backend', 'app', 'services'))
from car_lookup import get_car_info, parse_steer_lock

db_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'

print(f"{'Filename':<70} | {'Meta String':<25} | {'Parsed':<6} | {'Final Lock':<6}")
print("-" * 115)

for filename in os.listdir(db_dir):
    if filename.endswith(".duckdb"):
        db_path = os.path.join(db_dir, filename)
        try:
            con = duckdb.connect(db_path)
            res = con.execute("SELECT key, value FROM metadata WHERE key IN ('CarName', 'CarClass', 'CarSetup')").fetchall()
            meta = {k: v for k, v in res}
            
            raw_car = meta.get('CarName', 'Unknown')
            raw_class = meta.get('CarClass', 'Unknown')
            
            meta_steer_lock = None
            s_val = "N/A"
            if 'CarSetup' in meta:
                car_setup = json.loads(meta['CarSetup'])
                if 'VM_STEER_LOCK' in car_setup:
                    s_val = car_setup['VM_STEER_LOCK'].get('stringValue', '')
                    meta_steer_lock = parse_steer_lock(s_val)
            
            # This is the new logic we implemented in TelemetryService
            model_name, final_lock = get_car_info(raw_car, raw_class, override_steer_lock=meta_steer_lock)
            
            print(f"{filename:<70} | {s_val:<25} | {str(meta_steer_lock):<6} | {str(final_lock):<6}")
            con.close()
        except Exception as e:
            # print(f"Error {filename}: {e}")
            pass
