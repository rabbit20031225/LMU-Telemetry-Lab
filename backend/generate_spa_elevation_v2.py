# generate_spa_elevation_v2.py
import duckdb
import numpy as np
import pandas as pd
import os

# Configuration
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'
OUT_CSV = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\spa_elevation_results_v3.csv'

# Manual Reference Points (provided by user)
REF_POINTS = [
    { "dist": 0, "alt": 410.0 },
    { "dist": 250, "alt": 412.0 },
    { "dist": 750, "alt": 358.0 },
    { "dist": 1000, "alt": 380.0 },
    { "dist": 1800, "alt": 460.0 },
    { "dist": 2500, "alt": 435.0 },
    { "dist": 3500, "alt": 395.0 },
    { "dist": 4500, "alt": 385.0 },
    { "dist": 5000, "alt": 370.0 },
    { "dist": 6000, "alt": 390.0 },
    { "dist": 6800, "alt": 408.0 },
    { "dist": 7004, "alt": 410.0 }
]

def upsample(arr, target_n):
    if len(arr) == 0: return np.zeros(target_n)
    return np.interp(np.linspace(0, len(arr)-1, target_n), np.arange(len(arr)), arr)

def run():
    print(f"Connecting to DB...")
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found at {DB_PATH}")
        return

    try:
        con = duckdb.connect(DB_PATH, read_only=True)
        
        # 1. Fetch Baseline
        gt_df = con.execute('SELECT value FROM "GPS Time"').df()
        gps_times = gt_df['value'].values
        n_100 = len(gps_times)
        start_ts = gps_times[0]
        end_ts = gps_times[-1]
        
        # 2. Fetch required channels
        print("Fetching channels...")
        speed_raw = con.execute('SELECT value FROM "Ground Speed"').df()['value'].values
        lat_raw = con.execute('SELECT value FROM "GPS Latitude"').df()['value'].values
        lon_raw = con.execute('SELECT value FROM "GPS Longitude"').df()['value'].values
        
        try:
            t_raw = con.execute('SELECT value FROM "Throttle Pos"').df()['value'].values
            b_raw = con.execute('SELECT value FROM "Brake Pos"').df()['value'].values
        except:
            t_raw = con.execute('SELECT value FROM "Throttle"').df()['value'].values
            b_raw = con.execute('SELECT value FROM "Brake"').df()['value'].values

        # 3. Lap Boundaries
        lap_starts = [x[0] for x in con.execute("SELECT ts FROM \"Lap\" ORDER BY ts").fetchall()]
        
        con.close()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return

    # Master Timeline (100Hz)
    master_time = np.linspace(start_ts, end_ts, n_100)
    dt = (end_ts - start_ts) / (n_100 - 1)
    
    # Pre-process Speed for integration (m/s)
    if np.max(speed_raw) > 150: speed_ms = speed_raw / 3.6
    else: speed_ms = speed_raw
    
    # Upsample high-rate data to master (just in case length mismatch)
    speed_100 = upsample(speed_ms, n_100)
    lat_100 = upsample(lat_raw, n_100)
    lon_100 = upsample(lon_raw, n_100)
    t_100 = upsample(t_raw, n_100)
    b_100 = upsample(b_raw, n_100)

    # RECONSTRUCT DISTANCE (Online Logic)
    print("Reconstructing distance from speed integration...")
    dist_cumulative = np.cumsum(speed_100 * dt)
    
    # Precise Lap 3 (Starts at 568.42s, Ends at 711.96s)
    l_start_ts = 568.42
    l_end_ts = 711.96
    
    idx_s = int((l_start_ts - start_ts) / dt)
    idx_e = int((l_end_ts - start_ts) / dt) + 1
    
    if idx_s < 0: idx_s = 0
    if idx_e > n_100: idx_e = n_100
    
    # Slice Lap 3
    lat_l = lat_100[idx_s:idx_e]
    lon_l = lon_100[idx_s:idx_e]
    t_l = t_100[idx_s:idx_e]
    b_l = b_100[idx_s:idx_e]
    
    # Distance for Lap 3
    base_dist = dist_cumulative[idx_s]
    dist_l_raw = dist_cumulative[idx_s:idx_e] - base_dist
    
    # Normalize to 7004m (Reference for Spa)
    # The actual integrated distance might be slightly off due to track limits/drift
    actual_lap_len = dist_l_raw[-1]
    print(f"Integrated Lap Length: {actual_lap_len:.2f}m")
    dist_l = dist_l_raw * (7004.0 / actual_lap_len)
    
    # 4. Elevation Interpolation
    ref_dists = [p['dist'] for p in REF_POINTS]
    ref_alts = [p['alt'] for p in REF_POINTS]
    elev_l = np.interp(dist_l, ref_dists, ref_alts)
    
    # 5. FORCE CLOSURE (Coordinate and Elevation)
    # To fix the "spike", both ends must meet in 3D space
    lat_l[-1] = lat_l[0]
    lon_l[-1] = lon_l[0]
    elev_l[-1] = elev_l[0] # Aligned to 410.0m
    
    # Save results
    results = pd.DataFrame({
        'Lap_Dist': dist_l,
        'Latitude': lat_l,
        'Longitude': lon_l,
        'Elevation': elev_l,
        'Throttle': t_l,
        'Brake': b_l
    })
    
    results.to_csv(OUT_CSV, index=False)
    print(f"Saved refined results to {OUT_CSV}")
    print(f"Elevation Range: {np.min(elev_l):.2f} to {np.max(elev_l):.2f}")

if __name__ == "__main__":
    run()
