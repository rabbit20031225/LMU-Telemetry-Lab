import duckdb
import os
import sys
import numpy as np
import pandas as pd

# Add backend to path
sys.path.append(os.getcwd())

from app.services.elevation_service import get_3d_track_data, extract_lap_telemetry
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
        
    print(f"Fastest Lap: {fastest_lap_num}, Using Target Lap: {lap_num}")
    
    # Trace extract_lap_telemetry
    print("\n--- Diagnostic: extract_lap_telemetry(lap_num=1) ---")
    data_raw = extract_lap_telemetry(con, lap_num, 0)
    if data_raw is None:
        print("RESULT IS NONE!")
    else:
        print(f"Keys: {list(data_raw.keys())}")
        print(f"Lengths: {[len(v) for v in data_raw.values() if isinstance(v, (np.ndarray, list))]}")
    
    # Trace deeper manual checks
    tables = [t[0] for t in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    df_time = con.execute('SELECT value as ts FROM "GPS Time"').df()
    df_laps = con.execute('SELECT ts, value FROM "Lap"').df()
    
    lap_info = df_laps[df_laps['value'] == lap_num]
    if not lap_info.empty:
        t_start = lap_info['ts'].values[0]
        next_lap = df_laps[df_laps['ts'] > t_start].head(1)
        t_end = next_lap['ts'].values[0] if not next_lap.empty else df_time['ts'].iloc[-1]
        print(f"Slicing Range: {t_start} to {t_end}")
        idxs = np.where((df_time['ts'] >= t_start) & (df_time['ts'] < t_end))[0]
        print(f"Found {len(idxs)} indices in df_time (out of {len(df_time)})")
    else:
        print(f"LAP {lap_num} NOT FOUND IN df_laps!")

    data = get_3d_track_data(con, lap_num, fastest_lap_num, "Sebring", "Default")
    print(f"\nFinal API Result: BaseMap={len(data['baseMap'])}, RacingLine={len(data['racingLine'])}")
