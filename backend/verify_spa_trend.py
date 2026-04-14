import pandas as pd
import numpy as np

def verify():
    df = pd.read_csv('spa_elevation_results.csv')
    e = df['Elevation'].values
    
    # Eau Rouge is approx at T = 15s (Index 1500)
    # Raidillon peaks at T = 25s (Index 2500)
    # Initial downhill at T = 5s (Index 500)
    
    start_height = e[0]
    t1_bottom = np.min(e[500:1500])
    raidillon_top = np.max(e[1500:3000])
    
    print(f"Start Height: {start_height:.2f}m")
    print(f"T1 Bottom (La Source to Eau Rouge): {t1_bottom:.2f}m (Diff: {t1_bottom - start_height:.2f}m)")
    print(f"Raidillon Top: {raidillon_top:.2f}m (Gain from bottom: {raidillon_top - t1_bottom:.2f}m)")
    print(f"Total Elevation Gain (Eau Rouge): {raidillon_top - t1_bottom:.2f}m")
    
    # Expected gain at Eau Rouge is ~40m.
    # Our result:
    factor = 40.0 / (raidillon_top - t1_bottom)
    print(f"\nScaling Factor needed for Spa: {factor:.4f}")
    
    # Apply scaling
    e_scaled = e * factor
    print(f"Scaled Spa Range: {np.min(e_scaled):.2f}m to {np.max(e_scaled):.2f}m")
    print(f"Total Scaled Range: {np.max(e_scaled) - np.min(e_scaled):.2f}m (Target: ~104m)")

if __name__ == "__main__":
    verify()
