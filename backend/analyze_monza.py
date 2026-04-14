import duckdb
import pandas as pd
import numpy as np

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

# List all tables to see the channel names clearly
tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
print("Available Tables:", tables)

def get_channel_data(target_name):
    # Try case-insensitive and space-insensitive match if direct match fails
    matched_table = None
    for t in tables:
        if t.lower().replace(" ", "") == target_name.lower().replace(" ", ""):
            matched_table = t
            break
    
    if matched_table:
        print(f"Fetching table: {matched_table}")
        # Use separate arguments for table name to be safe if f-string is weird
        query = f'SELECT ts, value FROM "{matched_table}" ORDER BY ts'
        return pd.DataFrame(con.execute(query).fetchall(), columns=['ts', 'value'])
    return pd.DataFrame()

df_lat_raw = get_channel_data('Path Lateral')
df_edge_raw = get_channel_data('Track Edge')

if df_lat_raw.empty or df_edge_raw.empty:
    print(f"Error: Missing channels in DB. Found tables matching: { [t for t in tables if 'path' in t.lower() or 'edge' in t.lower()] }")
    exit()

# Fusion
start_ts = max(df_lat_raw['ts'].min(), df_edge_raw['ts'].min())
end_ts = min(df_lat_raw['ts'].max(), df_edge_raw['ts'].max())
master_ts = np.arange(start_ts, start_ts + 5.0, 0.02) # Just look at first 5 seconds for summary

df_master = pd.DataFrame({'ts': master_ts})

df_fused = pd.merge_asof(df_master, df_lat_raw, on='ts', direction='backward').rename(columns={'value': 'lat_raw'})
df_fused = pd.merge_asof(df_fused, df_edge_raw, on='ts', direction='backward').rename(columns={'value': 'edge_raw'})

df_fused['lat_interp'] = df_fused['lat_raw'].interpolate(method='linear')
df_fused['edge_interp'] = df_fused['edge_raw'].interpolate(method='linear')

print("\n--- DATA SAMPLE (First 5 seconds) ---")
pd.set_option('display.max_rows', 100)
print(df_fused[['ts', 'lat_raw', 'lat_interp', 'edge_raw', 'edge_interp']])

print("\n--- RAW SPACING ANALYSIS ---")
print(f"Path Lateral average raw spacing: {df_lat_raw['ts'].diff().mean():.4f}s")
print(f"Track Edge average raw spacing: {df_edge_raw['ts'].diff().mean():.4f}s")

df_fused.to_csv('monza_data_analysis.csv', index=False)
print("\nSaved analysis to monza_data_analysis.csv")
con.close()
