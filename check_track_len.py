
import sys
import os
import duckdb
import numpy as np

DB_PATH = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb"

def check():
    con = duckdb.connect(DB_PATH)
    
    # 1. Lap Boundaries
    lap_starts = [x[0] for x in con.execute("SELECT ts FROM \"Lap\" ORDER BY ts").fetchall()]
    start_time = con.execute("SELECT value FROM \"GPS Time\" LIMIT 1").fetchone()[0]
    
    final_boundaries = sorted(list(set(lap_starts)))
    if not final_boundaries or (final_boundaries[0] - start_time > 1.0):
         final_boundaries.insert(0, start_time)
         
    # 2. Get Speeds (Continuous)
    speed_df = con.execute("SELECT value FROM \"Ground Speed\" ORDER BY rowid").df()
    speed_vals = speed_df['value'].values
    
    # Align Speed to Master Time to get speed at gap
    # Simple: Map index to GPS Time
    gps_time_df = con.execute("SELECT value FROM \"GPS Time\" ORDER BY rowid").df()
    gps_times = gps_time_df['value'].values
    
    speed_ts = np.interp(np.linspace(0, len(gps_times)-1, len(speed_vals)), np.arange(len(gps_times)), gps_times)
    
    # 3. Get Lap Dist (Continuous)
    ld_df = con.execute("SELECT value FROM \"Lap Dist\" ORDER BY rowid").df()
    ld_vals = ld_df['value'].values
    
    # Align Lap Dist to Time
    ld_ts = np.interp(np.linspace(0, len(gps_times)-1, len(ld_vals)), np.arange(len(gps_times)), gps_times)
    
    print(f"Laps: {len(final_boundaries)}")
    
    for i in range(len(final_boundaries)-1):
        s = final_boundaries[i]
        e = final_boundaries[i+1]
        
        # Slice Lap Dist
        mask = (ld_ts >= s) & (ld_ts < e)
        if not np.any(mask): continue
        
        last_val = ld_vals[mask][-1]
        last_t = ld_ts[mask][-1]
        
        gap = e - last_t
        
        # Find Speed
        idx_spd = np.searchsorted(speed_ts, last_t)
        if idx_spd < len(speed_vals):
            v = speed_vals[idx_spd]
        else:
            v = 0
            
        gap_dist = v * gap
        total = last_val + gap_dist
        
        print(f"Lap {i}: Dur={e-s:.3f}s. RawMax={last_val:.3f}m. Gap={gap:.4f}s @ {v:.2f}m/s -> +{gap_dist:.3f}m. Total={total:.4f}m")

if __name__ == "__main__":
    check()
