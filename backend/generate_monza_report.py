import duckdb
import pandas as pd
import numpy as np

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

def get_data(name):
    return pd.DataFrame(con.execute(f'SELECT ts, value FROM "{name}"').fetchall(), columns=['ts', 'value'])

df_lat = get_data("Path Lateral")
df_edge = get_data("Track Edge")

# Master time at 50Hz (typical for UI/Backend fusion)
start_t = max(df_lat['ts'].min(), df_edge['ts'].min())
master_ts = np.arange(start_t, start_t + 2.0, 0.02) # 2 seconds of data
df_master = pd.DataFrame({'ts': master_ts})

# Fusion
df_fused = pd.merge_asof(df_master, df_lat, on='ts', direction='backward').rename(columns={'value': 'lat_raw'})
df_fused = pd.merge_asof(df_fused, df_edge, on='ts', direction='backward').rename(columns={'value': 'edge_raw'})

# Interpolation
df_fused['lat_interp'] = df_fused['lat_raw'].interpolate(method='linear')
df_fused['edge_interp'] = df_fused['edge_raw'].interpolate(method='linear')

print("=== TELEMETRY DATA DIAGNOSTIC (Monza) ===")
print(f"Sampling: Raw is ~100Hz, Master is 50Hz")
print(f"Showing first 50 samples (1 second):")
pd.set_option('display.max_rows', 100)
print(df_fused[['ts', 'lat_raw', 'lat_interp', 'edge_raw', 'edge_interp']].to_string(index=False))

# Check for gaps/jumps
print("\n=== DATA QUALITY CHECK ===")
print(f"Unique Path Lateral values: {df_lat['value'].nunique()}")
print(f"Unique Track Edge values: {df_edge['value'].nunique()}")

# Find any sections where Track Edge is 0
zeros = df_edge[df_edge['value'] < 0.1]
if not zeros.empty:
    print(f"Found {len(zeros)} dropouts (0 values) in Track Edge!")
    print(zeros.head())
else:
    print("No 0-value dropouts found in Track Edge in this session.")

con.close()
