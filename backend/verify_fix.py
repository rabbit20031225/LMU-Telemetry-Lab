from app.services.telemetry_service import TelemetryService
import os
import pandas as pd
import numpy as np

# Set up logging to see our carry-over logs
import logging
logging.basicConfig(level=logging.INFO)

db_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
# This file is known to have compound changes or at least data we can test trimming on
db_file = 'Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
db_path = os.path.join(db_dir, db_file)

# Let's pick a middle time
# First get approximate range
laps_info = TelemetryService.get_laps_header(db_path)
total_duration = laps_info['metadata']['sessionDuration']
start_trim = laps_info['laps'][2]['startTime'] + 10.0 # 10 seconds into Lap 2
end_trim = laps_info['laps'][2]['endTime'] - 10.0

print(f"Trimming from {start_trim} to {end_trim}")

df = TelemetryService.fuse_session_data(
    db_path, 
    trim_start_time=start_trim, 
    trim_end_time=end_trim,
    target_freq=10
)

if 'TyresCompound' in df.columns:
    # TyresCompound is a list of 4 values in the DF
    first_val = df['TyresCompound'].iloc[0]
    print(f"First TyresCompound row: {first_val}")
    
    nan_count = df['TyresCompound'].apply(lambda x: any(v is None or (isinstance(v, float) and np.isnan(v)) for v in x)).sum()
    print(f"Total rows: {len(df)}, Rows with NaNs: {nan_count}")
    
    if nan_count < len(df) * 0.1: # Allow some NaNs if they are genuine gaps, but not the whole thing
        print("VERIFICATION SUCCESS: Data carried over and filled.")
    else:
        print("VERIFICATION FAILURE: Most rows are still NaN.")
else:
    print("TyresCompound column not found in fused data!")
