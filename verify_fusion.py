import pandas as pd
import numpy as np

FILE_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'

try:
    print(f"Loading {FILE_PATH}...")
    df = pd.read_parquet(FILE_PATH)
    
    print("\n--- DataFrame Info ---")
    print(df.info())
    
    print("\n--- Time Steps Verification ---")
    time_diffs = np.diff(df['Time'].values)
    mean_diff = np.mean(time_diffs)
    min_diff = np.min(time_diffs)
    max_diff = np.max(time_diffs)
    print(f"Mean Time Delta: {mean_diff:.6f} (Expected 0.001)")
    print(f"Min Time Delta: {min_diff:.6f}")
    print(f"Max Time Delta: {max_diff:.6f}")
    
    if np.allclose(time_diffs, 0.001, atol=1e-5):
        print("PASS: Time steps are consistently 1ms.")
    else:
        print("FAIL: Time steps are inconsistent.")

    print("\n--- Continuous Data Check (e.g. Speed) ---")
    if 'Speed' in df.columns:
        speed_nans = df['Speed'].isna().sum()
        print(f"Speed: {len(df) - speed_nans} non-null values out of {len(df)}")
        print(f"Speed Sample (First 5): {df['Speed'].values[:5]}")
    else:
        print("Speed column not found.")

    print("\n--- Reconstructed Lap Check ---")
    if 'Lap' in df.columns:
        laps = df['Lap'].unique()
        print(f"Unique Laps Found: {laps}")
        # Check if continuous (integers)
        print(f"Lap Sample (First 1000): {df['Lap'].values[:1000:100]}")
    else:
        print("Lap column not found.")

    print("\n--- Calculated Lap Dist Check ---")
    if 'Lap Dist' in df.columns:
        dist = df['Lap Dist']
        print(f"Dist Range: {dist.min():.2f} to {dist.max():.2f}")
        # Check reset
        # Find where Lap changes
        lap_changes = np.where(np.diff(df['Lap'].values) > 0)[0]
        if len(lap_changes) > 0:
            print(f"Lap Changes at indices: {lap_changes}")
            # Check dist at change
            for idx in lap_changes:
                print(f"  At idx {idx}: Lap {df['Lap'].iloc[idx]}->{df['Lap'].iloc[idx+1]}, Dist {df['Lap Dist'].iloc[idx]:.2f}->{df['Lap Dist'].iloc[idx+1]:.2f}")
    else:
        print("Lap Dist column not found.")
        
except Exception as e:
    print(f"Error: {e}")
