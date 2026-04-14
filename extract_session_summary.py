import duckdb
import pandas as pd
import json

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
meta_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\session_metadata.json'
laps_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\session_laps.csv'

try:
    con = duckdb.connect(db_path)
    
    # 1. Metadata
    print("Extracting Metadata...")
    meta_df = con.execute("SELECT * FROM metadata").df()
    
    # Convert list of {key, value} to single dict
    meta_dict = {}
    for _, row in meta_df.iterrows():
        key = row['key']
        val = row['value']
        
        # Try to parse JSON strings (like CarSetup)
        try:
            val_parsed = json.loads(val)
            val = val_parsed
        except:
            pass # Keep as string if not JSON
            
        meta_dict[key] = val
    
    with open(meta_file, 'w') as f:
        json.dump(meta_dict, f, indent=4)
    print(f"Saved metadata to {meta_file}")

    # 2. Lap Summary
    print("Extracting Lap Summary...")
    
    # 2. Lap Summary
    print("Extracting Lap Summary...")
    
    # Get tables
    # Load ALL lap times, even if 0, to align with Lap 0, 1, 2...
    lap_time = con.execute("SELECT ts, value as LapTime FROM \"Lap Time\" ORDER BY ts").df()
    
    try:
        s1 = con.execute("SELECT ts, value as LastS1 FROM \"Last Sector1\" ORDER BY ts").df()
        s2 = con.execute("SELECT ts, value as LastS2 FROM \"Last Sector2\" ORDER BY ts").df()
        
        # Round timestamps for robust merging
        lap_time['ts_round'] = lap_time['ts'].round(3)
        s1['ts_round'] = s1['ts'].round(3)
        s2['ts_round'] = s2['ts'].round(3)
        
        merged = pd.merge(lap_time, s1[['ts_round', 'LastS1']], on='ts_round', how='left')
        merged = pd.merge(merged, s2[['ts_round', 'LastS2']], on='ts_round', how='left')
        
        # Fill NaN with 0 BEFORE calculation
        merged = merged.fillna(0)
        
        # Calculate Sector Times
        # Logic: 
        # S1 = LastS1
        # S2 = LastS2 - LastS1
        # S3 = LapTime - LastS2
        
        merged['S1'] = merged['LastS1']
        merged['S2'] = merged['LastS2'] - merged['LastS1']
        merged['S3'] = merged['LapTime'] - merged['LastS2']
        
        # Clean up
        # Assign Lap 0, 1, 2... based on row order
        merged['Lap'] = range(0, len(merged))
        
        # Check for Incomplete Final Lap
        # Get Session End Time from GPS Time
        try:
             # Fast check using count or max
             max_gps = con.execute("SELECT MAX(value) FROM \"GPS Time\"").fetchone()[0]
             # Or just rows count * 0.01 + start?
             # Better to trust max value if exists, but schema showed 'value' in inspect?
             # Schema inspect (Step 754): GPS Time (ts... wait? no, inspection said: 42: GPS Time: 51002 rows. 167: GPS Speed (value).
             # Step 754 line 110 Lap schema ts value.
             # Step 754 line 171 GPS Speed schema value.
             # GPS Time schema? Not explicitly detailed in Step 754 'Detailed Inspection', but listed in summary.
             # Usually "GPS Time" doesn't have a 'value' column, it IS the time column in other tables?
             # OR it's a table "GPS Time" with a column "value"?
             # Let's assume there is a way to get max time.
             # "Lap" table has `ts`.
             # Let's check "GPS Time" content.
             pass
        except:
             max_gps = None

        # Safer: Get MAX(ts) from any table, e.g. GPS Speed which has 5101 rows?
        # Or just use the last timestamp from Lap Time?
        last_lap_end = merged['ts'].max()
        
        # We need to know if data extends beyond last_lap_end.
        # Let's query max TS from a high-freq table like "GPS Speed" (or "GPS Data"?)
        # Inspect Step 754 line 171: GPS Speed has 'value'. It likely matches rows of "GPS Time".
        # Assume "GPS Time" is a table with "value" (the time).
        
        has_extra_lap = False
        try:
             # Try to get max time
             # Inspect showed "GPS Time" table exists.
             # Let's assume it has column 'col0' or 'value'.
             # Or simply:
             max_time_res = con.execute("SELECT MAX(value) FROM \"GPS Time\"").fetchone()
             if max_time_res and max_time_res[0]:
                 max_t = max_time_res[0]
                 if max_t > last_lap_end + 1.0:
                     has_extra_lap = True
        except:
             # Fallback: Check if Lap table has an entry > last_lap_end?
             # The Lap table usually marks the START of the current lap.
             # If Lap table has start > last_lap_end?
             # No, Lap table 533.58 == Lap Time 533.58.
             # But if there is data AFTER 533.58, it is the next lap.
             # Assuming yes for now if we can't prove otherwise?
             # User asked to "match fused_data".
             # fused_data always has a final segment.
             has_extra_lap = True # Default to adding it?
        
        if has_extra_lap:
            next_lap_idx = merged['Lap'].max() + 1
            new_row = pd.DataFrame([{
                'Lap': next_lap_idx,
                'ts': 0.0, # Or max_t? User said 0 for missing.
                'LapTime': 0.0,
                'S1': 0.0,
                'S2': 0.0,
                'S3': 0.0
            }])
            # ts should probably be 0 or current? User said "no lap time... treat as 0".
            # The 'ts' col in summary usually implies Lap End Time. 
            # For incomplete lap, End Time is undefined (or 0).
            merged = pd.concat([merged, new_row], ignore_index=True)

        # Reorder
        final_cols = ['Lap', 'ts', 'LapTime', 'S1', 'S2', 'S3']
        merged = merged[final_cols]
        
        # Final explicit fill (just in case)
        merged = merged.fillna(0)
        
        merged.to_csv(laps_file, index=False)
        print(f"Saved lap summary to {laps_file}")
        print(merged.head())
        
    except Exception as e:
        print(f"Error processing sectors: {e}")
        lap_time.to_csv(laps_file, index=False)

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
