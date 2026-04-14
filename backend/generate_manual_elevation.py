# -*- coding: utf-8 -*-
import duckdb
import numpy as np
import pandas as pd
import os

# Database Path
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'
OUT_CSV = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\spa_elevation_results.csv'

# Reference Points from User
REF_POINTS = [
    (0, 410.0),
    (250, 412.0),
    (750, 358.0),
    (1000, 380.0),
    (1800, 460.0),
    (2500, 435.0),
    (3500, 395.0),
    (4500, 385.0),
    (5000, 370.0),
    (6000, 390.0),
    (6800, 408.0),
    (7004, 410.0)
]

def run():
    print(f"Connecting to DB...")
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found at {DB_PATH}")
        return

    try:
        con = duckdb.connect(DB_PATH, read_only=True)
        # Fetch channels
        print("Fetching channels...")
        # Use Ground Speed (usually 100Hz) as the master frequency
        df_speed = con.execute('SELECT value FROM "Ground Speed"').df()
        df_lat = con.execute('SELECT value FROM "GPS Latitude"').df()
        df_lon = con.execute('SELECT value FROM "GPS Longitude"').df()
        df_dist = con.execute('SELECT value FROM "Lap Dist"').df()
        df_thr = con.execute('SELECT value FROM "Throttle Pos"').df()
        df_brk = con.execute('SELECT value FROM "Brake Pos"').df()
        con.close()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return

    # Master length
    n = len(df_speed)
    print(f"Master Data length: {n}")

    def upsample(arr, target_n):
        if len(arr) == 0: return np.zeros(target_n)
        if len(arr) == target_n: return arr
        return np.interp(np.linspace(0, len(arr)-1, target_n), np.arange(len(arr)), arr)

    print("Upsampling channels...")
    lat_all = upsample(df_lat['value'].values, n)
    lon_all = upsample(df_lon['value'].values, n)
    dist_all = upsample(df_dist['value'].values, n)
    thr_all = upsample(df_thr['value'].values, n)
    brk_all = upsample(df_brk['value'].values, n)
    
    # Fastest Lap indices (Lap 3: 568.42s to 711.96s)
    # T0 = 67.05
    # l_start = (568.42 - 67.05) * 100 = 50137
    # l_end = (711.96 - 67.05) * 100 = 64491
    l_start, l_end = 50137, 64492 
    
    if l_end > n:
        print(f"Warning: indices {l_start}:{l_end} out of range ({n}). Clipping.")
        l_end = n

    # Slice the best lap
    lat_l = lat_all[l_start:l_end]
    lon_l = lon_all[l_start:l_end]
    dist_l = dist_all[l_start:l_end]
    thr_l = thr_all[l_start:l_end]
    brk_l = brk_all[l_start:l_end]
    
    if len(dist_l) == 0:
        print("ERROR: Sliced lap is empty. Check indices.")
        return

    # 1. GENERATE ELEVATION PROFILE
    ref_d = [p[0] for p in REF_POINTS]
    ref_a = [p[1] for p in REF_POINTS]
    
    # Normalize distal point for closure
    max_d_telemetry = dist_l[-1]
    alt_start = ref_a[0]
    
    d_points = ref_d.copy()
    a_points = ref_a.copy()
    
    # Adjust last point to telemetry max distance
    if max_d_telemetry > d_points[-1]:
        d_points.append(max_d_telemetry)
        a_points.append(alt_start)
    else:
        d_points[-1] = max_d_telemetry
        a_points[-1] = alt_start
        
    print(f"Telemetry D_max: {max_d_telemetry:.2f}m. Mapping to {alt_start}m for vertical closure.")
    
    # Interpolate
    elev_l = np.interp(dist_l, d_points, a_points)
    
    # 2. SAVE RESULTS
    results = pd.DataFrame({
        'Index': np.arange(len(elev_l)),
        'Lap_Dist': dist_l,
        'Latitude': lat_l,
        'Longitude': lon_l,
        'Elevation': elev_l,
        'Throttle': thr_l,
        'Brake': brk_l
    })
    
    # EXPLICIT CLOSURE: Duplicate first point at the end
    first_pt = results.iloc[0].copy()
    # We keep the index and Lap_Dist from the last point to avoid sorting issues if any, 
    # but overwrite coordinate/telemetry data from first point
    last_idx = results.index[-1]
    last_dist = results.iloc[-1]['Lap_Dist']
    
    # Create the closure row
    closure_pt = first_pt.copy()
    closure_pt['Lap_Dist'] = last_dist + 0.1 # Small offset to keep it at the end
    
    results = pd.concat([results, pd.DataFrame([closure_pt])], ignore_index=True)
    
    results.to_csv(OUT_CSV, index=False)
    print(f"Saved refined data with closure and coloring to {OUT_CSV}")
    print(f"Final Elevation Range: {np.min(elev_l):.1f}m to {np.max(elev_l):.1f}m")
    
if __name__ == "__main__":
    run()
