import pandas as pd
import numpy as np

CSV_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\spa_elevation_results.csv'

def diag():
    df = pd.read_csv(CSV_PATH)
    
    # 1. Check a few key points
    # Normalize Lap_Dist for debugging (the script does this internally)
    min_d = df['Lap_Dist'].min()
    max_d = df['Lap_Dist'].max() # This might be tricky if it resets
    
    print(f"File Min Dist: {min_d}, Max Dist: {max_d}")
    
    # Let's see the first and last few rows
    print("\nHead:")
    print(df.head())
    print("\nTail:")
    print(df.tail())
    
    # Find points near a specific distance
    # e.g. Eau Rouge (750m) and Les Combes (1800m)
    # Since the lap starts at ~3236m, we need to handle the loop.
    
    print("\nPoints where Lap_Dist is near 3236 (Start of slice):")
    print(df[df['Lap_Dist'].between(3230, 3240)].head())
    
    print("\nPoints where Lap_Dist is near 6978 (Max dist in session):")
    print(df[df['Lap_Dist'].between(6970, 6980)].head())

    print("\nPoints where Lap_Dist is near 2.29 (Min dist in session):")
    print(df[df['Lap_Dist'].between(0, 10)].head())

    print("\nPoints where Lap_Dist is near 750 (Eau Rouge):")
    print(df[df['Lap_Dist'].between(740, 760)].head())
    
    print("\nPoints where Lap_Dist is near 1800 (Les Combes):")
    print(df[df['Lap_Dist'].between(1790, 1810)].head())

if __name__ == "__main__":
    diag()
