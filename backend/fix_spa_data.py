# -*- coding: utf-8 -*-
import duckdb
import numpy as np
import pandas as pd
import os

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'
OUT_CSV = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\spa_elevation_results.csv'

def run():
    print(f"Connecting to DB...")
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found at {DB_PATH}")
        return

    try:
        con = duckdb.connect(DB_PATH, read_only=True)
        
        # Fetch required channels
        print("Fetching channels...")
        # LMU DuckDB stores values in the 'value' column of channel tables
        df_speed = con.execute('SELECT value FROM "Ground Speed"').df()
        df_g = con.execute('SELECT value FROM "G Force Long"').df()
        df_dist = con.execute('SELECT value FROM "Lap Dist"').df()
        df_lat = con.execute('SELECT value FROM "GPS Latitude"').df()
        df_lon = con.execute('SELECT value FROM "GPS Longitude"').df()
        con.close()
    except Exception as e:
        print(f"Error connecting to DB or fetching data: {e}")
        return

    # Basic data
    v = df_speed['value'].values / 3.6  # m/s
    g = df_g['value'].values
    dist = df_dist['value'].values
    lat = df_lat['value'].values
    lon = df_lon['value'].values
    
    print(f"Speed length: {len(v)}")
    print(f"G-Long length: {len(g)}")
    print(f"Dist length: {len(dist)}")
    print(f"Lat length: {len(lat)}")
    print(f"Lon length: {len(lon)}")
    
    n = len(v)
    print(f"Data length (100Hz): {n}")
    
    # Upsample 10Hz data to 100Hz
    def upsample(arr, target_n):
        if len(arr) == 0: return np.zeros(target_n)
        return np.interp(np.linspace(0, len(arr)-1, target_n), np.arange(len(arr)), arr)

    g_100 = upsample(g, n)
    lat_100 = upsample(lat, n)
    lon_100 = upsample(lon, n)
    dist_100 = upsample(dist, n)

    # Sync (Fixed -89.27s lag)
    lag_samples = int(-89.27 / 0.01)
    
    def align(arr, lag):
        out = np.zeros_like(arr)
        if lag > 0:
            out[lag:] = arr[:-lag]
        elif lag < 0:
            abs_lag = abs(lag)
            out[:-abs_lag] = arr[abs_lag:]
        else:
            out = arr
        return out

    g_aligned = align(g_100, lag_samples)
    lat_aligned = align(lat_100, lag_samples)
    lon_aligned = align(lon_100, lag_samples)
    dist_aligned = align(dist_100, lag_samples)

    # Fastest Complete Lap (Lap 3 based on analyze_laps.py)
    l_start, l_end = 35869, 50138
    
    if l_end > n:
        print(f"Warning: indices {l_start}:{l_end} out of range for length {n}. Using available range.")
        l_end = n

    v_l = v[l_start:l_end]
    g_l = g_aligned[l_start:l_end]
    lat_l = lat_aligned[l_start:l_end]
    lon_l = lon_aligned[l_start:l_end]
    dist_l = dist_aligned[l_start:l_end]
    
    # Calculate acceleration (a = dv/dt)
    a_l = np.zeros_like(v_l)
    a_l[1:] = (v_l[1:] - v_l[:-1]) / 0.01
    
    # Calculate height change (dh = (g - a) / 9.81 * v * dt)
    dh = (g_l - a_l) / 9.81 * (v_l * 0.01)
    
    # --- SMOOTHING ---
    # Apply a moving average filter to dh to reduce noise (window of 21 samples = 0.21s)
    window_size = 21
    if len(dh) > window_size:
        dh_smooth = np.convolve(dh, np.ones(window_size)/window_size, mode='same')
    else:
        dh_smooth = dh
        
    elev = np.cumsum(dh_smooth)
    
    # Closure (Linear drift correction)
    elev -= np.linspace(0, elev[-1], len(elev))
    
    # --- HEIGHT CORRECTION ---
    current_range = np.max(elev) - np.min(elev)
    target_range = 102.2
    scaling_factor = target_range / current_range if current_range != 0 else 1.0
    
    print(f"Current Range: {current_range:.2f}m")
    print(f"Applying Scaling Factor: {scaling_factor:.4f} to reach target {target_range}m")
    
    elev_scaled = elev * scaling_factor
    
    # Save results
    results = pd.DataFrame({
        'Index': np.arange(len(elev_scaled)),
        'Lap_Dist': dist_l,
        'Latitude': lat_l,
        'Longitude': lon_l,
        'Elevation': elev_scaled
    })
    
    results.to_csv(OUT_CSV, index=False)
    print(f"Saved corrected data with GPS to {OUT_CSV}")
    print(f"Final Range: {np.min(elev_scaled):.2f}m to {np.max(elev_scaled):.2f}m")

if __name__ == "__main__":
    run()
