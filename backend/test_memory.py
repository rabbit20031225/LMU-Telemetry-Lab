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

# 1. Test Header Extraction (includes SQL fix)
print("\n--- Header Extraction ---")
try:
    header = TelemetryService.get_laps_header(db_path)
    print(f"Laps found: {len(header['laps'])}")
    print(f"Stints found: {max([l.get('stint', 1) for l in header['laps']])}")
except Exception as e:
    print(f"Header EXCEPTION: {e}")

# 2. Test Full Fuse (60Hz)
print("\n--- Telemetry Fusion (60Hz) ---")
try:
    df = TelemetryService.fuse_session_data(db_path, target_freq=60)
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
