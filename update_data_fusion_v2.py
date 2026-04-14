import os
import re
import json

path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\data_fusion_v2.py'

if not os.path.exists(path):
    print(f"File not found: {path}")
    exit(1)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'from car_lookup import get_car_info',
    'from car_lookup import get_car_info, parse_steer_lock'
)

# 2. Update steering calibration block (line 294 onwards)
target_block = r"""        # 4c. Steering Angle Calibration
        print("Calibrating Steering Angle...")
        try:
            # Get Car Name/Class from Metadata Table
            # Metadata table has key, value columns
            meta_rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('CarName', 'CarClass')").fetchall()
            meta_dict = {k: v for k, v in meta_rows}
            
            car_name = meta_dict.get('CarName', 'Unknown')
            car_class = meta_dict.get('CarClass', 'Unknown')
            
            print(f"  Metadata Car: {car_name} ({car_class})")
            
            # Lookup
            real_name, steering_lock = get_car_info(car_name, car_class)"""

replacement_block = r"""        # 4c. Steering Angle Calibration
        print("Calibrating Steering Angle...")
        try:
            # Get Car Name/Class from Metadata Table
            # Metadata table has key, value columns
            meta_rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('CarName', 'CarClass', 'CarSetup')").fetchall()
            meta_dict = {k: v for k, v in meta_rows}
            
            car_name = meta_dict.get('CarName', 'Unknown')
            car_class = meta_dict.get('CarClass', 'Unknown')
            
            print(f"  Metadata Car: {car_name} ({car_class})")
            
            # Try to extract steering lock from metadata
            meta_steer_lock = None
            try:
                if 'CarSetup' in meta_dict:
                    import json
                    car_setup = json.loads(meta_dict['CarSetup'])
                    if 'VM_STEER_LOCK' in car_setup:
                        s_val = car_setup['VM_STEER_LOCK'].get('stringValue', '')
                        meta_steer_lock = parse_steer_lock(s_val)
                        if meta_steer_lock:
                            print(f"  Extracted Steering Lock from Metadata: {meta_steer_lock}")
            except: pass

            # Lookup
            real_name, steering_lock = get_car_info(car_name, car_class, override_steer_lock=meta_steer_lock)"""

content = content.replace(target_block, replacement_block)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Successfully updated data_fusion_v2.py")
