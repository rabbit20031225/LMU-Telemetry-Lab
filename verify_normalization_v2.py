import pandas as pd
import numpy as np

FILE_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'

try:
    print(f"Loading {FILE_PATH}...")
    df = pd.read_parquet(FILE_PATH)
    
    # Check max distance per lap
    lap_stats = df.groupby('Lap')['Lap Dist'].max()
    # print("\n--- Normalized Lap Dist Stats ---")
    # print(lap_stats)
    
    # Target
    target = 5823.4168
    
    for lap in [1, 2, 3]:
        max_d = lap_stats.get(lap, 0)
        diff = abs(max_d - target)
        print(f"Lap {lap}: Max={max_d:.4f} m, Diff={diff:.4f} m")
        if diff < 0.1:
            print("  [OK] Normalized correctly.")
        else:
            print("  [FAIL] Distance mismatch!")
            
    # Check Lap 0 and Last Lap (4)
    print(f"Lap 0 (Out Lap): Max={lap_stats.get(0, 0):.4f} m (Not normalized, expected)")
    print(f"Lap 4 (Incomplete): Max={lap_stats.get(4, 0):.4f} m (Not normalized, expected)")

except Exception as e:
    print(f"Error: {e}")
