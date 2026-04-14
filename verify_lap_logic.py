import pandas as pd
import numpy as np

FILE_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'

try:
    print(f"Loading {FILE_PATH}...")
    df = pd.read_parquet(FILE_PATH)
    
    # 1. Start Offset
    print("\n--- Check 1: Initial Offset ---")
    start_dist = df['Lap Dist'].iloc[0]
    print(f"Start Time: {df['Time'].iloc[0]}")
    print(f"Start Lap Dist: {start_dist:.2f}")
    if abs(start_dist - 4725.0) < 100.0:
        print("PASS: Initial offset looks reasonable.")
    else:
        print("FAIL: Initial offset unexpected.")

    # 2. Lap Transitions
    print("\n--- Check 2: Lap Transitions ---")
    # Detect where Lap changes
    lap_changes = df.index[df['Lap'].diff() > 0].tolist()
    
    for idx in lap_changes:
        time_at_change = df['Time'].iloc[idx]
        lap_from = df['Lap'].iloc[idx-1]
        lap_to = df['Lap'].iloc[idx]
        dist_before = df['Lap Dist'].iloc[idx-1]
        dist_after = df['Lap Dist'].iloc[idx]
        
        print(f"Transition at Time {time_at_change:.3f}s: Lap {lap_from} -> {lap_to}")
        print(f"  Dist Reset: {dist_before:.2f} -> {dist_after:.2f}")
        
        # Check specific expected values
        if abs(time_at_change - 86.7) < 1.0:
            print("  -> Matches Calculated Boundary (Lap 0 -> 1)")
        elif abs(time_at_change - 272.44) < 1.0:
            print("  -> Matches Native Boundary (Lap 1 -> 2)")

    # 3. Lap 1 Duration Check
    # Find start and end of Lap 1
    lap1_data = df[df['Lap'] == 1]
    if not lap1_data.empty:
        start_t = lap1_data['Time'].iloc[0]
        end_t = lap1_data['Time'].iloc[-1]
        dur = end_t - start_t
        print(f"\n--- Check 3: Lap 1 Duration ---")
        print(f"Lap 1: {start_t:.3f} to {end_t:.3f} (Duration: {dur:.3f}s)")
        if abs(dur - 185.74) < 1.0:
            print("PASS: Matches Lap Time table duration.")
        else:
            print(f"FAIL: Expected ~185.74, got {dur:.3f}")

except Exception as e:
    print(f"Error: {e}")
