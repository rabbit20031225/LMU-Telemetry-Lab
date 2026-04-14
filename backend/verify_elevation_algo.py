import duckdb
import pandas as pd
import numpy as np
import os

import datetime

# Configuration
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
OUTPUT_CSV = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\elevation_verification_monza.csv'

def calculate_elevation(db_path, output_csv):
    print(f"[{datetime.datetime.now()}] Starting Calculation...")
    print(f"Connecting to {db_path}...")
    con = duckdb.connect(db_path, read_only=True)
    
    try:
        # 1. Load Required Channels
        print("Loading base channels...")
        df_speed = con.execute('SELECT value FROM "Ground Speed" ORDER BY rowid').df()
        df_time = con.execute('SELECT value FROM "GPS Time" ORDER BY rowid').df()
        df_glong = con.execute('SELECT value FROM "G Force Long" ORDER BY rowid').df()
        df_dist = con.execute('SELECT value FROM "Lap Dist" ORDER BY rowid').df()
        
        gps_times = df_time['value'].values
        n_master = len(gps_times)

        print(f"Interpolating GLong ({len(df_glong)}) and Dist ({len(df_dist)}) to {n_master} master points...")
        
        def get_interp_channel(source_vals, target_times):
            if len(source_vals) == len(target_times):
                return source_vals
            src_indices = np.linspace(0, len(target_times)-1, len(source_vals))
            source_time = np.interp(src_indices, np.arange(len(target_times)), target_times)
            return np.interp(target_times, source_time, source_vals)

        glong_interp = get_interp_channel(df_glong['value'].values, gps_times)
        dist_interp = get_interp_channel(df_dist['value'].values, gps_times)
        speed_raw = get_interp_channel(df_speed['value'].values, gps_times)
        
        # Recon Laps
        print("Reconstructing Laps...")
        lap_starts = [x[0] for x in con.execute('SELECT ts FROM "Lap" ORDER BY ts').fetchall()]
        lap_channel = np.zeros(len(gps_times))
        current_lap = 0
        for i in range(len(lap_starts)):
            t_start = lap_starts[i]
            t_end = lap_starts[i+1] if i+1 < len(lap_starts) else gps_times[-1] + 1.0
            mask = (gps_times >= t_start) & (gps_times < t_end)
            lap_channel[mask] = current_lap
            current_lap += 1

        # Smoothing Helper
        def smooth(arr, window_sec=1.0, freq=100):
            w = int(window_sec * freq)
            if w <= 1: return arr
            return np.convolve(arr, np.ones(w)/w, mode='same')

        print("Smoothing channels (1.0s window)...")
        speed_ms = smooth(speed_raw / 3.6, window_sec=1.0)
        glong_s = smooth(glong_interp, window_sec=1.0)

        # 2. Pick a full lap for verification
        lap_counts = pd.Series(lap_channel).value_counts().sort_index()
        target_lap = 23 
        if target_lap not in lap_counts.index:
             target_lap = lap_counts.iloc[1:].idxmax()

        idxs = np.where(lap_channel == target_lap)[0]
        if len(idxs) < 10:
            print(f"Error: Lap {target_lap} too short.")
            return

        v = speed_ms[idxs]
        t = gps_times[idxs]
        g = glong_s[idxs]
        d = dist_interp[idxs]

        print(f"Processing Lap {target_lap} ({len(idxs)} samples)...")

        # 3. Algorithm Implementation (GOLDEN LOGIC)
        elevations = np.zeros(len(idxs))
        current_h = 0.0
        
        for i in range(1, len(idxs)):
            dt = t[i] - t[i-1]
            if dt <= 0:
                elevations[i] = current_h
                continue
                
            # dv / dt (Discrete)
            a_real = (v[i] - v[i-1]) / dt
            
            # g_slope = (G * 9.81) - a_real
            a_gravity = (g[i] * 9.81) - a_real
            
            # Δh = Δd * (a_gravity / 9.81)
            dd = d[i] - d[i-1]
            # CLAMP: Handle interpolation artifacts near lap resets
            # Max speed 360km/h = 100m/s -> 1.0m per 0.01s sample
            if dd < 0 or dd > 2.0: 
                dd = 0
            
            dh = dd * (a_gravity / 9.81)
            
            current_h += dh
            elevations[i] = current_h
            
        # 4. Drift Correction
        total_drift = elevations[-1]
        n_samples = len(elevations)
        corrections = np.linspace(0, total_drift, n_samples)
        elev_corrected = elevations - corrections
        
        # 5. Export
        print(f"Raw Drift: {total_drift:.2f}m")
        print(f"Corrected Range: {np.min(elev_corrected):.2f}m to {np.max(elev_corrected):.2f}m")
        
        out_df = pd.DataFrame({
            'Time': t,
            'Speed_ms': v,
            'GLong_Smooth': g,
            'Dist': d,
            'Elevation_Raw': elevations,
            'Elevation_Corrected': elev_corrected
        })
        out_df.to_csv(output_csv, index=False)
        print("Success!")
    except Exception as e:
        import traceback
        print(f"An error occurred: {e}")
        traceback.print_exc()
        
    finally:
        con.close()

if __name__ == "__main__":
    calculate_elevation(DB_PATH, OUTPUT_CSV)
