import duckdb
import pandas as pd
import numpy as np
import json

con = duckdb.connect('telemetry.duckdb')

# 1. Find Session ID
session_info = con.execute("SELECT id, path FROM sessions WHERE path LIKE '%Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z%'").fetchone()
if not session_info:
    print("Session not found")
    exit()

session_id = session_info[0]
print(f"Found Session ID: {session_id}")

# 2. Get Raw Data for Path Lateral and Track Edge
# Assuming tables are named like "Path Lateral" and "Track Edge" in DuckDB
try:
    raw_lateral = con.execute(f'SELECT "Time", "Value" FROM "Path Lateral" WHERE session_id = ? ORDER BY "Time"', [session_id]).fetchall()
    raw_edge = con.execute(f'SELECT "Time", "Value" FROM "Track Edge" WHERE session_id = ? ORDER BY "Time"', [session_id]).fetchall()
except Exception as e:
    print(f"Error reading raw tables: {e}")
    # Try alternate table names or list tables
    print("Available tables:", con.execute("SHOW TABLES").fetchall())
    exit()

# 3. Get Fused Data (interpolated)
# We can simulate the backend fusion logit or just read what's produced.
# The backend uses merge_asof for fusion.

df_lateral = pd.DataFrame(raw_lateral, columns=['Time', 'Lateral'])
df_edge = pd.DataFrame(raw_edge, columns=['Time', 'Edge'])

# Simulation of backend fusion: 50Hz (0.02s) master time
start_time = min(df_lateral['Time'].min(), df_edge['Time'].min())
end_time = max(df_lateral['Time'].max(), df_edge['Time'].max())
master_time = np.arange(start_time, end_time, 0.02)
df_master = pd.DataFrame({'Time': master_time})

fused = pd.merge_asof(df_master, df_lateral, on='Time', direction='backward')
fused = pd.merge_asof(fused, df_edge, on='Time', direction='backward')

# Interpolate missing values
fused = fused.interpolate(method='linear', limit_direction='both')

# Output a sample for the first 100 points
print("\n--- SAMPLE RAW PATH LATERAL (First 10) ---")
print(df_lateral.head(10))

print("\n--- SAMPLE RAW TRACK EDGE (First 10) ---")
print(df_edge.head(10))

print("\n--- SAMPLE FUSED & INTERPOLATED (Time 0 - 2s) ---")
print(fused.head(20))

# Check for anomalies: large jumps or zeros
print("\n--- ANOMALY CHECK ---")
print(f"Path Lateral Max: {fused['Lateral'].max()}, Min: {fused['Lateral'].min()}")
print(f"Track Edge Max: {fused['Edge'].max()}, Min: {fused['Edge'].min()}")

edge_zeros = (fused['Edge'] < 0.1).sum()
print(f"Track Edge Zeros/Dropouts: {edge_zeros} / {len(fused)}")

# Save to a log file for detailed inspection
fused.to_csv('diag_data_comparison.csv', index=False)
print("\nFull data saved to diag_data_comparison.csv")
