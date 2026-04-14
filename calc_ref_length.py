import pandas as pd
import numpy as np

FILE_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'

try:
    print(f"Loading {FILE_PATH}...")
    df = pd.read_parquet(FILE_PATH)
    
    # Group by Lap and get max Distance
    # Note: Our fused data Lap Dist resets to 0 at start of lap.
    # So max value in a lap is the distance at the end of that lap.
    
    lap_stats = df.groupby('Lap')['Lap Dist'].max()
    print("\n--- Per-Lap Max Distance ---")
    print(lap_stats)
    
    # Exclude Lap 0 (Out Lap) and potentially last lap if incomplete
    # Valid laps: 1, 2, 3 (based on previous session_laps.csv)
    valid_laps = lap_stats.loc[[1, 2, 3]]
    print("\n--- Valid Laps Stats ---")
    print(valid_laps)
    print(f"Mean: {valid_laps.mean():.4f}")
    print(f"Median: {valid_laps.median():.4f}")
    print(f"Max: {valid_laps.max():.4f}")

except Exception as e:
    print(f"Error: {e}")
