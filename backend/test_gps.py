import os
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
stint_1_laps = [l for l in laps if l.get('stint', 1) == 1]
trim_start = min([l['startTime'] for l in stint_1_laps])
trim_end = max([l['endTime'] for l in stint_1_laps])

df = TelemetryService.fuse_session_data(db_path, target_freq=10, trim_start_time=trim_start, trim_end_time=trim_end)

print(f"Columns in DF: {len(df.columns)}")
gps_lat = 'GPS Latitude' in df.columns
gps_lon = 'GPS Longitude' in df.columns
print(f"Has GPS Latitude: {gps_lat}")
print(f"Has GPS Longitude: {gps_lon}")

if gps_lat and gps_lon:
    print(df[['Time', 'GPS Latitude', 'GPS Longitude']].head(10))
    print(df[['Time', 'GPS Latitude', 'GPS Longitude']].tail(10))
else:
    for col in df.columns:
        if 'gps' in col.lower() or 'lat' in col.lower() or 'lon' in col.lower():
            print(f"Found related col: {col}")
