import duckdb
import os
import sys
import pandas as pd

from app.services.telemetry_service import TelemetryService

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

print(f"Testing Extraction for: {files[0]}")

header = TelemetryService.get_laps_header(db_path)
laps = header['laps']
stints = [l.get('stint', 1) for l in laps]
print(f"Unique stints: {set(stints)}")

stint_1_laps = [l for l in laps if l.get('stint', 1) == 1]
trim_start = min([l['startTime'] for l in stint_1_laps])
trim_end = max([l['endTime'] for l in stint_1_laps])

print(f"Stint 1 duration: {trim_end - trim_start:.1f} seconds")

# 2. Test Full Fuse (60Hz) with Trims
try:
    df = TelemetryService.fuse_session_data(db_path, target_freq=60, trim_start_time=trim_start, trim_end_time=trim_end)
    print(f"DataFrame Shape: {df.shape}")
    
    mem_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
    print(f"DataFrame Memory: {mem_mb:.2f} MB")
    
    # Simulate endpoints.py JSON serialization
    json_parts = ['{']
    first = True
    for col in df.columns:
        if not first:
            json_parts.append(',')
        else:
            first = False
        json_parts.append(f'"{col}":')
        json_parts.append(df[col].to_json(orient='values'))
    json_parts.append('}')
    full_json = "".join(json_parts)
    
    json_mb = len(full_json) / (1024 * 1024)
    print(f"JSON Payload Size: {json_mb:.2f} MB")
    
except Exception as e:
    print(f"Fusion EXCEPTION: {e}")
