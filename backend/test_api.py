import duckdb
import os
import sys
import numpy as np

# Add backend to path
sys.path.append(os.getcwd())

from app.services.elevation_service import get_3d_track_data
from app.api.endpoints import TelemetryService

db_path = r'C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

with duckdb.connect(db_path, read_only=True) as con:
    # Mimic endpoint logic
    laps_header = TelemetryService.get_laps_header(db_path)
    laps_list = laps_header.get("laps", [])
    valid_laps = [l for l in laps_list if l.get('isValid') and not l.get('isOutLap')]
    
    lap_num = 1
    if valid_laps:
        best_lap = min(valid_laps, key=lambda x: x['duration'])
        fastest_lap_num = best_lap['lap']
    else:
        fastest_lap_num = lap_num
        
    print(f"Fastest Lap: {fastest_lap_num}, Using Lap: {lap_num}")
    
    # Check tables
    tables = [t[0] for t in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    print(f"Tables count: {len(tables)}")
    print(f"Has 'telemetry' table: {'telemetry' in tables}")
    
    data = get_3d_track_data(con, lap_num, fastest_lap_num, "Sebring", "Default")
    
    print(f"BaseMap points: {len(data['baseMap'])}")
    print(f"RacingLine points: {len(data['racingLine'])}")
    
    if len(data['baseMap']) > 0:
        print("Sample point:", data['baseMap'][0])
    else:
        print("BASEMAP IS EMPTY!")
