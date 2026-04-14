import os
import re
import json

path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\backend\app\services\telemetry_service.py'

if not os.path.exists(path):
    print(f"File not found: {path}")
    exit(1)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'from .car_lookup import get_car_info',
    'from .car_lookup import get_car_info, parse_steer_lock'
)

# 2. Add steer lock extraction in get_laps_header
# We look for the end of the metadata block
meta_end_pattern = r'(except:\r?\n\s+pass)'
extraction_code = r'\1\n            \n            # Extract Steering Lock from Metadata\n            meta_steer_lock = None\n            try:\n                if "CarSetup" in meta_dict:\n                    car_setup = json.loads(meta_dict["CarSetup"])\n                    if "VM_STEER_LOCK" in car_setup:\n                        s_val = car_setup["VM_STEER_LOCK"].get("stringValue", "")\n                        meta_steer_lock = parse_steer_lock(s_val)\n                        if meta_steer_lock:\n                            logger.info(f"Extracted Steering Lock from Metadata: {meta_steer_lock}")\n            except Exception as e:\n                logger.warning(f"Failed to extract steer lock from metadata: {e}")'

# Only replace the first occurrence (which is inside get_laps_header)
content = re.sub(meta_end_pattern, extraction_code, content, count=1)

# 3. Update get_car_info call in get_laps_header
content = content.replace(
    'real_car_name, _ = get_car_info(raw_car, raw_class)',
    'real_car_name, final_steer_lock = get_car_info(raw_car, raw_class, override_steer_lock=meta_steer_lock)'
)

# 4. Add steeringLock to metadata dict in get_laps_header
content = content.replace(
    '"tyreCompoundMax": tyre_compound_max\n            }',
    '"tyreCompoundMax": tyre_compound_max,\n                "steeringLock": final_steer_lock\n            }'
)

# 5. Update fuse_session_data
fuse_target = '            real_name, steering_lock = get_car_info(car_name, car_class)'
fuse_replacement = """            # Try to extract steering lock from metadata
            meta_steer_lock = None
            try:
                if 'CarSetup' in meta_dict:
                    import json
                    car_setup = json.loads(meta_dict['CarSetup'])
                    if 'VM_STEER_LOCK' in car_setup:
                        s_val = car_setup['VM_STEER_LOCK'].get('stringValue', '')
                        meta_steer_lock = parse_steer_lock(s_val)
            except: pass

            real_name, steering_lock = get_car_info(car_name, car_class, override_steer_lock=meta_steer_lock)"""

content = content.replace(fuse_target, fuse_replacement)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Successfully updated telemetry_service.py")
