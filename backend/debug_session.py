from app.services.telemetry_service import TelemetryService
import os
import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO)

db = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_P_2026-02-22T09_02_40Z.duckdb'
h = TelemetryService.get_laps_header(db)

laps = h['laps']
if not laps:
    print("NO LAPS FOUND")
    exit()

lap_idx = min(1, len(laps) - 1) # Prefer Lap 1 or last lap
start = laps[lap_idx]['startTime']
end = laps[lap_idx]['endTime']

print(f"Testing Lap {lap_idx} from {start} to {end}")

df = TelemetryService.fuse_session_data(db, trim_start_time=start, trim_end_time=end, target_freq=10)

if 'TyresCompound' in df.columns:
    col = df['TyresCompound']
    print(f"First row: {col.iloc[0]}")
    print(f"Middle row: {col.iloc[len(df)//2]}")
    print(f"Last row: {col.iloc[-1]}")
    
    # Check for NaNs
    def is_nan_list(x):
        if x is None: return True
        return any(v is None or (isinstance(v, float) and np.isnan(v)) for v in x)

    nans = col.apply(is_nan_list).sum()
    print(f"Total rows: {len(df)}, Rows with ANY NaN in TyresCompound: {nans}")
else:
    print("TyresCompound NOT IN COLUMNS")
