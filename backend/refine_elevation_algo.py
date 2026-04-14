import pandas as pd
import numpy as np
import os
import duckdb

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
OUTPUT_CSV = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\elevation_refinement_monza.csv'

def smooth(arr, window=50): # 0.5s at 100Hz
    return np.convolve(arr, np.ones(window)/window, mode='same')

def refine():
    con = duckdb.connect(DB_PATH, read_only=True)
    df_speed = con.execute('SELECT value FROM "Ground Speed" ORDER BY rowid').df()
    df_time = con.execute('SELECT value FROM "GPS Time" ORDER BY rowid').df()
    df_glong = con.execute('SELECT value FROM "G Force Long" ORDER BY rowid').df()
    df_dist = con.execute('SELECT value FROM "Lap Dist" ORDER BY rowid').df()
    con.close()
    
    t = df_time['value'].values
    v = df_speed['value'].values / 3.6 # m/s
    
    # Interpolate GLong to master
    src_indices = np.linspace(0, len(t)-1, len(df_glong))
    source_time = np.interp(src_indices, np.arange(len(t)), t)
    g_raw = np.interp(t, source_time, df_glong['value'].values)
    d_raw = np.interp(t, source_time, df_dist['value'].values)

    # 1. Sync Optimization
    # Calculate a_real from smoothed speed
    v_s = smooth(v, 30)
    dt = np.median(np.diff(t))
    a_real = np.gradient(v_s, dt)
    
    # Cross correlate a_real and G_raw * 9.81
    # Check best shift within +/- 20 samples (0.2s)
    best_shift = 0
    min_err = 1e9
    target = g_raw * 9.81
    
    for s in range(-10, 11):
        if s == 0:
            err = np.mean((a_real - target)**2)
        elif s > 0:
            err = np.mean((a_real[s:] - target[:-s])**2)
        else:
            err = np.mean((a_real[:s] - target[-s:])**2)
        if err < min_err:
            min_err = err
            best_shift = s
            
    print(f"Optimal Sync Shift: {best_shift} samples ({best_shift*0.01:.2f}s)")
    
    # Apply Shift (G follows A or vice versa)
    if best_shift > 0:
        g_sync = np.zeros_like(g_raw)
        g_sync[best_shift:] = g_raw[:-best_shift]
    elif best_shift < 0:
        g_sync = np.zeros_like(g_raw)
        g_sync[:best_shift] = g_raw[-best_shift:]
    else:
        g_sync = g_raw
        
    # 2. Integration
    a_gravity = (g_sync * 9.81) - a_real
    
    # Filter: If speed is very low, slope is unreliable
    mask = v > 5.0 # Skip very slow/stopped parts
    a_gravity[~mask] = 0
    
    dist_diff = np.diff(d_raw, prepend=d_raw[0])
    dist_diff[dist_diff < 0] = 0
    
    dh = dist_diff * (a_gravity / 9.81)
    
    # 3. Lap Slicing (Lap 23)
    # (Assuming lap slicing from before)
    # We'll just do one lap
    # Find lap boundaries for Lap 23
    # For speed, we'll use d_raw reset to find laps
    lap_starts = np.where(np.diff(d_raw) < -1000)[0] + 1
    if len(lap_starts) > 23:
        start_idx = lap_starts[22]
        end_idx = lap_starts[23]
    else:
        start_idx = 0
        end_idx = len(t)
        
    slice_idxs = range(start_idx, end_idx)
    lap_dh = dh[slice_idxs]
    lap_elev = np.cumsum(lap_dh)
    
    # Drift Correction
    total_drift = lap_elev[-1]
    n = len(lap_elev)
    lap_elev_corrected = lap_elev - np.linspace(0, total_drift, n)
    
    print(f"Refined Drift: {total_drift:.2f}m")
    print(f"Refined Range: {np.min(lap_elev_corrected):.2f}m to {np.max(lap_elev_corrected):.2f}m")
    
    # Save
    pd.DataFrame({
        'Time': t[slice_idxs],
        'Elevation': lap_elev_corrected
    }).to_csv(OUTPUT_CSV, index=False)

if __name__ == "__main__":
    refine()
