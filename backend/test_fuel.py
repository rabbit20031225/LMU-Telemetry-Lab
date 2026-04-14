import os
import numpy as np
import duckdb
from app.services.telemetry_service import TelemetryService

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

print(f"Testing Extracted Fuel list from: {files[0]}")
try:
    con = duckdb.connect(db_path, read_only=True)
    fuel_df = con.execute("SELECT ts, value FROM \"Fuel Level\" ORDER BY ts").df()
    print("Fuel table rows:", len(fuel_df))
    print(fuel_df.head(10))
    
    header = TelemetryService.get_laps_header(db_path)
    laps = header['laps']
    for l in laps[:5]:
        print(f"Lap {l['lap']} Stint {l['stint']} Time: {l['duration']} FuelUsed: {l.get('fuelUsed')}")
        
    con.close()
except Exception as e:
    print("Error:", e)
