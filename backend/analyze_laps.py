import duckdb
import pandas as pd
import numpy as np

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'

def run():
    con = duckdb.connect(DB_PATH, read_only=True)
    try:
        df_dist = con.execute('SELECT value FROM "Lap Dist"').df()
        df_speed = con.execute('SELECT value FROM "Ground Speed"').df()
    except Exception as e:
        print(f"Error: {e}")
        return
    finally:
        con.close()

    dists = df_dist['value'].values
    speeds = df_speed['value'].values
    
    # Identify lap boundaries using distance resets
    # A reset happens when dist dropped significantly (e.g. > 5000m)
    boundaries = []
    start_idx = 0
    
    for i in range(1, len(dists)):
        if dists[i] < dists[i-1] - 5000:
            # Lap break detected
            boundaries.append((start_idx, i))
            start_idx = i
            
    # Add final segment
    boundaries.append((start_idx, len(dists)))
    
    laps = []
    for s, e in boundaries:
        if e <= s: continue
        lap_dists = dists[s:e]
        max_d = np.max(lap_dists)
        duration = (e - s) * 0.1 # 10Hz
        
        laps.append({
            'StartIdx10Hz': s,
            'EndIdx10Hz': e,
            'Duration': duration,
            'MaxDist': max_d
        })
        
    df_res = pd.DataFrame(laps)
    with open('lap_results.txt', 'w') as f:
        f.write("--- Detected Lap Segments ---\n")
        f.write(df_res.to_string() + "\n")
        
        # Filter for complete laps of Spa (~7004m)
        complete = df_res[(df_res['MaxDist'] > 6970) & (df_res['Duration'] > 120)].copy()
        
        if complete.empty:
            f.write("\nNo complete laps found (> 6980m and > 120s).\n")
            return

        # Fastest = Minimum duration
        fastest = complete.sort_values('Duration').iloc[0]
        f.write("\n--- FASTEST COMPLETE LAP ---\n")
        f.write(str(fastest) + "\n")
        
        ratio = len(speeds) / len(dists)
        l_start = int(fastest['StartIdx10Hz'] * ratio)
        l_end = int(fastest['EndIdx10Hz'] * ratio)
        
        f.write(f"\nRecommended indices (ratio {ratio:.1f}):\n")
        f.write(f"l_start, l_end = {l_start}, {l_end}\n")
    
    print("Results written to lap_results.txt")

if __name__ == "__main__":
    run()
