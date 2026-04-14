import duckdb
import pandas as pd
import numpy as np

# Path to the duckdb file
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
output_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\timestamp_precision_analysis.txt'

try:
    with open(output_file, 'w') as f:
        con = duckdb.connect(db_path)
        
        # 1. Load GPS Time reference
        f.write("Loading GPS Time...\n")
        gps_time_df = con.execute("SELECT value FROM \"GPS Time\" ORDER BY value").df()
        gps_times = gps_time_df['value'].values
        f.write(f"Loaded {len(gps_times)} GPS Time samples.\n")
        
        # Helper to find nearest GPS time
        def analyze_alignment(table_name, ts_col='ts'):
            f.write(f"\n--- Analyzing '{table_name}' ({ts_col}) ---\n")
            try:
                ts_data = con.execute(f"SELECT {ts_col} FROM \"{table_name}\" ORDER BY {ts_col}").df()
                timestamps = ts_data[ts_col].values
                
                if len(timestamps) == 0:
                    f.write("No data found.\n")
                    return

                # Check exact matches
                mask = np.isin(timestamps, gps_times)
                exact_matches = np.sum(mask)
                f.write(f"Total events: {len(timestamps)}\n")
                f.write(f"Exact matches with GPS Time: {exact_matches} ({exact_matches/len(timestamps)*100:.2f}%)\n")
                
                # Check precision (decimal places)
                # We can check modulo 0.01 for 100Hz alignment
                # using a small epsilon for float comparison
                remainders = np.abs(timestamps * 100 - np.round(timestamps * 100))
                misaligned_100hz = np.sum(remainders > 1e-5)
                f.write(f"Non-100Hz aligned timestamps (>1e-5 deviation from 0.01 grid): {misaligned_100hz}\n")

                if len(timestamps) > 0:
                    # Calculate offsets to nearest GPS Time
                    # Use searchsorted to find insertion points
                    idxs = np.searchsorted(gps_times, timestamps)
                    idxs = np.clip(idxs, 0, len(gps_times)-1)
                    
                    # Check current and previous to find nearest
                    diffs = np.abs(gps_times[idxs] - timestamps)
                    
                    # Check previous index for potential closer match
                    idxs_prev = np.clip(idxs - 1, 0, len(gps_times)-1)
                    diffs_prev = np.abs(gps_times[idxs_prev] - timestamps)
                    
                    min_diffs = np.minimum(diffs, diffs_prev)
                    
                    f.write(f"Max deviation from nearest GPS Time: {np.max(min_diffs):.6f} sec\n")
                    f.write(f"Avg deviation from nearest GPS Time: {np.mean(min_diffs):.6f} sec\n")
                    
                    # Show some examples of misalignment
                    misaligned_indices = np.where(min_diffs > 1e-4)[0]
                    if len(misaligned_indices) > 0:
                        f.write("\nExamples of misaligned events:\n")
                        for i in misaligned_indices[:5]:
                            ts_val = timestamps[i]
                            nearest_gps = gps_times[idxs[i]] if diffs[i] < diffs_prev[i] else gps_times[idxs_prev[i]]
                            f.write(f"  Event ts: {ts_val:.6f} vs Nearest GPS: {nearest_gps:.6f} (Diff: {min_diffs[i]:.6f})\n")

            except Exception as e:
                f.write(f"Error analyzing {table_name}: {e}\n")

        # Analyze typical event tables
        analyze_alignment('Lap')
        analyze_alignment('Gear')
        analyze_alignment('Sector1 Flag')
        analyze_alignment('TC')
        analyze_alignment('Brake Pos', ts_col='rowid') # Just to check rowid alignment logic if needed, but Brake Pos likely has no ts
        
        # Check a table that definitely has ts
        analyze_alignment('Speed Limiter')

except Exception as e:
    with open(output_file, 'a') as f:
        f.write(f"Global Error: {e}\n")
finally:
    if 'con' in locals():
        con.close()
