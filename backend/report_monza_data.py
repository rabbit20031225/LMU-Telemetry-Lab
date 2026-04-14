import duckdb
import pandas as pd
import numpy as np

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

def get_channel(name):
    # Determine columns first
    cols = [c[1] for c in con.execute(f"PRAGMA table_info(\"{name}\")").fetchall()]
    if 'ts' in cols:
        df = pd.DataFrame(con.execute(f'SELECT ts, value FROM "{name}" ORDER BY ts').fetchall(), columns=['ts', 'value'])
    else:
        df = pd.DataFrame(con.execute(f'SELECT rowid as ts, value FROM "{name}" ORDER BY rowid').fetchall(), columns=['ts', 'value'])
    df['ts'] = df['ts'].astype(float)
    df['value'] = df['value'].astype(float)
    return df

df_lat = get_channel("Path Lateral")
df_edge = get_channel("Track Edge")
df_gps_time = get_channel("GPS Time")

# Map rowid to actual GPS Time
if len(df_lat) == len(df_gps_time):
    df_lat['actual_ts'] = df_gps_time['value'].values
else:
    df_lat['actual_ts'] = df_lat['ts']

if len(df_edge) == len(df_gps_time):
    df_edge['actual_ts'] = df_gps_time['value'].values
else:
    df_edge['actual_ts'] = df_edge['ts']

# Master time 50Hz
start_t = float(df_gps_time['value'].iloc[0])
end_t = float(df_gps_time['value'].iloc[200]) # 2 seconds
master_ts = np.arange(start_t, end_t, 0.02)
df_master = pd.DataFrame({'ts': master_ts.astype(float)})

# Merge
fused = pd.merge_asof(
    df_master, 
    df_lat[['actual_ts', 'value']].rename(columns={'actual_ts': 'ts'}).sort_values('ts'), 
    on='ts', direction='backward'
).rename(columns={'value': 'lat_raw'})

fused = pd.merge_asof(
    fused, 
    df_edge[['actual_ts', 'value']].rename(columns={'actual_ts': 'ts'}).sort_values('ts'), 
    on='ts', direction='backward'
).rename(columns={'value': 'edge_raw'})

# Interpolated
fused['lat_interp'] = fused['lat_raw'].interpolate(method='linear')
fused['edge_interp'] = fused['edge_raw'].interpolate(method='linear')

print("=== MONZA RAW VS INTERPOLATED DATA REPORT ===")
print(f"Sampling: Raw ~100Hz, Master 50Hz")
print(fused.head(40).to_string(index=False))

con.close()
