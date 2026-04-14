import duckdb
import pandas as pd

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    # 1. Get Lap Boundaries (Native)
    # Using Lap 2 as the reference
    lap_start = 272.440
    lap_end = 405.740
    print(f"Reference Lap (Lap 2): {lap_start} -> {lap_end} (Duration: {lap_end - lap_start:.3f}s)")
    
    # 2. Handle Index Alignment
    print("\nReading Time and Speed tables...")
    # Read full tables to map indices
    gps_time = con.execute("SELECT value FROM \"GPS Time\"").df()['value'].values
    gps_speed = con.execute("SELECT value FROM \"GPS Speed\"").df()['value'].values
    lap_dist = con.execute("SELECT value FROM \"Lap Dist\"").df()['value'].values
    
    # Ratios
    n_time = len(gps_time)
    n_speed = len(gps_speed)
    n_dist = len(lap_dist)
    
    print(f"Row Counts: Time={n_time}, Speed={n_speed}, Dist={n_dist}")
    
    # 3. Find Indices for Reference Lap (Lap 2 End)
    # Lap 2 End Time = 405.740
    # Find index in GPS Time
    # Using searchsorted
    import numpy as np
    
    # Find index of lap end time in GPS Time
    idx_end_time = np.searchsorted(gps_time, lap_end, side='left')
    
    # Map to Lap Dist index
    # Assuming Lap Dist is uniformly sampled relative to GPS Time?
    # Ratio = n_dist / n_time
    ratio = n_dist / n_time
    idx_end_dist = int(idx_end_time * ratio)
    
    # Get the last Lap Dist value BEFORE the cut
    # We want the max value in the lap.
    # Check a window around idx_end_dist
    window = 50 # check 50 points (approx 5 seconds?)
    start_search = max(0, idx_end_dist - window)
    end_search = min(n_dist, idx_end_dist + 5) # look slightly ahead just in case?
    
    dist_segment = lap_dist[start_search:end_search]
    
    # Find max in this segment
    # Note: Lap Dist resets to 0. So we want the peak before the drop.
    # The drop happens at lap boundary.
    # So max value in this window should be the track length approx.
    
    # Let's find index of max
    local_max_idx = np.argmax(dist_segment)
    global_max_idx = start_search + local_max_idx
    max_val = dist_segment[local_max_idx]
    
    print(f"Max Raw Dist found at index {global_max_idx}: {max_val:.4f}")
    
    # Re-map this index back to Time
    # If idx_dist corresponding to idx_time via linear ratio
    # idx_time_approx = global_max_idx / ratio
    idx_time_approx = int(global_max_idx / ratio)
    
    # Get Time and Speed at this point
    t_at_max = gps_time[idx_time_approx]
    # Use global_max_idx for speed, assuming same length or close alignment
    # Note: gps_speed might have more rows?
    # Ratios: 
    # idx_speed = idx_time_approx * (n_speed / n_time)
    idx_speed = int(idx_time_approx * (n_speed / n_time))
    
    speed_at_max = gps_speed[idx_speed]
    
    print(f"Time at Max Dist: {t_at_max:.4f} s")
    print(f"Speed at Max Dist: {speed_at_max:.4f} (units?)")
    
    # 4. Integrate Gap
    # Gap from t_at_max to actual lap_end (405.740)
    gap_time = lap_end - t_at_max
    print(f"Gap Time: {gap_time:.4f} s")
    
    # Calculate Dist
    # Check unit of speed
    # Start speed was 0.000064?
    # If sample speed is ~60, it corresponds to ~216kph. Plausible.
    # If sample speed is ~216, it corresponds to ~777kph. Too fast.
    # So units are likely m/s.
    
    gap_dist = speed_at_max * gap_time
    final_len = max_val + gap_dist
    
    print(f"\n--- Result ---")
    print(f"Raw Max: {max_val:.4f} m")
    print(f"Gap Add: {gap_dist:.4f} m")
    print(f"Total:   {final_len:.4f} m")


except Exception as e:
    print(f"Error: {e}")
