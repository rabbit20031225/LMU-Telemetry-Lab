import duckdb
import pandas as pd
import numpy as np
import os
import datetime

# Configuration for Spa
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'
OUTPUT_CSV = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\elevation_verification_pitch_corrected.csv'
LAG_SEC = -89.27
TARGET_LAP = 5
WHEELBASE = 2.65
PITCH_CORRECTION_SIGN = 1.0

def smooth(arr, window_sec=0.5, freq=100):
    w = int(window_sec * freq)
    if w <= 1: return arr
    return np.convolve(arr, np.ones(w)/w, mode='same')

def calculate_elevation(db_path, output_csv, target_lap_num):
    print(f"[{datetime.datetime.now()}] Starting Spa-Francorchamps Elevation Calculation...")
    con = duckdb.connect(db_path, read_only=True)
    
    try:
        # 1. Load Channels
        print("Loading channels...")
        df_speed = con.execute('SELECT value FROM "Ground Speed" ORDER BY rowid').df()
        df_time = con.execute('SELECT value FROM "GPS Time" ORDER BY rowid').df()
        df_glong = con.execute('SELECT value FROM "G Force Long" ORDER BY rowid').df()
        df_dist = con.execute('SELECT value FROM "Lap Dist" ORDER BY rowid').df()
        df_frh = con.execute('SELECT value FROM "FrontRideHeight" ORDER BY rowid').df()
        df_rrh = con.execute('SELECT value FROM "RearRideHeight" ORDER BY rowid').df()
        
        gps_times = df_time['value'].values
        n_master = len(gps_times)

        # 2. Interpolate all to master frequency (100Hz)
        def align_to_master(target_len, source_vals):
            if len(source_vals) == target_len: return source_vals
            src_indices = np.linspace(0, target_len - 1, len(source_vals))
            target_indices = np.arange(target_len)
            return np.interp(target_indices, src_indices, source_vals)

        v_raw = align_to_master(n_master, df_speed['value'].values)
        g_orig = align_to_master(n_master, df_glong['value'].values)
        d_orig = align_to_master(n_master, df_dist['value'].values)
        frh_orig = align_to_master(n_master, df_frh['value'].values)
        rrh_orig = align_to_master(n_master, df_rrh['value'].values)
        
        # 3. Synchronize 10Hz subsystem
        dt = 0.01
        lag_samples = int(LAG_SEC / dt)
        print(f"Applying temporal shift: {lag_samples} samples ({LAG_SEC}s)")
        
        def shift_array(arr, lag):
            shifted = np.zeros_like(arr)
            if lag > 0:
                shifted[lag:] = arr[:-lag]
            elif lag < 0:
                abs_lag = abs(lag)
                shifted[:-abs_lag] = arr[abs_lag:]
            else: shifted = arr
            return shifted

        g_aligned = shift_array(g_orig, lag_samples)
        d_aligned = shift_array(d_orig, lag_samples)
        frh_aligned = shift_array(frh_orig, lag_samples)
        rrh_aligned = shift_array(rrh_orig, lag_samples)

        # 4. Smoothing
        v_ms = smooth(v_raw / 3.6, window_sec=0.5)
        g_s = smooth(g_aligned, window_sec=0.5)
        frh_s = smooth(frh_aligned, window_sec=0.5)
        rrh_s = smooth(rrh_aligned, window_sec=0.5)

        # 5. Lap Slicing
        df_laps = con.execute('SELECT ts, value FROM "Lap" ORDER BY ts').df()
        lap_info = df_laps[df_laps['value'] == target_lap_num]
        if lap_info.empty: lap_info = df_laps.iloc[-2:-1]
        
        t_start = lap_info['ts'].values[0]
        next_lap = df_laps[df_laps['ts'] > t_start].head(1)
        t_end = next_lap['ts'].values[0] if not next_lap.empty else gps_times[-1]

        idxs = np.where((gps_times >= t_start) & (gps_times < t_end))[0]
        print(f"Processing Lap {target_lap_num} ({len(idxs)} samples)...")

        # Slice data
        v = v_ms[idxs]
        t = gps_times[idxs]
        g = g_s[idxs]
        d = d_aligned[idxs]
        frh = frh_s[idxs]
        rrh = rrh_s[idxs]
        
        # 6. Physical Integration
        rh_scale = 0.001 if np.max(np.abs(frh)) > 1.0 else 1.0
        pitch_angle = np.arctan((rrh - frh) * rh_scale / WHEELBASE)
        g_pitch_error = np.sin(pitch_angle) * 9.81
        
        g_corr = g + (PITCH_CORRECTION_SIGN * g_pitch_error)
        a_real = np.zeros_like(v)
        a_real[1:] = (v[1:] - v[:-1]) / dt
        
        a_slope = g_corr - a_real  # G is in m/s2
        
        dd = np.zeros_like(d)
        dd[1:] = d[1:] - d[:-1]
        dd[dd < 0] = 0
        dd[dd > 2.0] = 0
        
        dh = dd * (a_slope / 9.81)
        elev_raw = np.cumsum(dh)
        
        # Lap Closure
        total_drift = elev_raw[-1]
        elev_corr = elev_raw - np.linspace(0, total_drift, len(elev_raw))
        
        print(f"Raw Drift: {total_drift:.2f}m")
        print(f"Range: {np.min(elev_corr):.2f}m to {np.max(elev_corr):.2f}m")

        # 7. Final CSV
        out_df = pd.DataFrame({
            'Time': t,
            'Speed_ms': v,
            'GLong_ms2': g,
            'G_Corrected_ms2': g_corr,
            'Dist': d,
            'Elevation_Corrected': elev_corr
        })
        out_df.to_csv(output_csv, index=False)
        print("Success!")
        
    finally:
        con.close()

if __name__ == "__main__":
    calculate_elevation(DB_PATH, OUTPUT_CSV, TARGET_LAP)
