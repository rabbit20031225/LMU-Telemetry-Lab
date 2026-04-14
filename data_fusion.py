import duckdb
import pandas as pd
import numpy as np
import os

# Configuration
DB_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
OUTPUT_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'
CSV_OUTPUT_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.csv'

def main():
    print(f"Connecting to {DB_PATH}...")
    try:
        con = duckdb.connect(DB_PATH)
        
        # 1. Load Reference Time (GPS Time)
        print("Loading GPS Time...")
        gps_time_df = con.execute("SELECT value FROM \"GPS Time\" ORDER BY rowid").df()
        gps_times = gps_time_df['value'].values
        
        start_time = gps_times[0]
        end_time = gps_times[-1]
        
        print(f"GPS Time Range: {start_time:.3f} to {end_time:.3f} s")
        print(f"GPS Samples: {len(gps_times)}")
        
        # 2. Creates 1000Hz Master Index
        # We start from start_time and go to end_time with 0.001s step
        master_time = np.arange(start_time, end_time + 0.001, 0.001)
        master_time = np.round(master_time, 3) # Ensure precision
        
        print(f"Master Index (1000Hz) created. Length: {len(master_time)}")
        
        # Initialize Master DataFrame
        # We'll use a dictionary of arrays first for performance, then convert to DataFrame
        fused_data = {'Time': master_time}
        
        # Get all tables
        tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
        
        # Tables to skip (metadata or handled specially)
        # Tables to skip (metadata or handled specially, plus user exclusions)
        skip_tables = [
            'GPS Time', 'metadata', 'channelsList', 'eventsList', 'Session Info',
            # User requested exclusions
            'AntiStall Activated', 'Best LapTime', 'Best Sector1', 'Best Sector2', 
            'CloudDarkness', 'Engine Max RPM', 'Headlights State',
            'Brakes Air Temp', 'Clutch RPM', 'FFB Output', 'Steering Pos Unfiltered', 
            'Steering Shaft Torque', 'SurfaceTypes', 'Throttle Pos Unfiltered', 
            'Time Behind Next', 'Wheel Speed', 'WheelsDetached', 'Wind Heading', 'Wind Speed',
            # Additional exclusions
            'Brake Pos Unfiltered', 'Clutch Pos Unfiltered', 'Front3rdDeflection',
            'GPS Speed', 'RearFlapActivated', 'Rear3rdDeflection', 'Regen Rate', 
            'RearFlapLegalStatus'
        ]
        
        # 3. Iterate tables
        for table in tables:
            if table in skip_tables:
                continue
                
            print(f"Processing table: {table}...")
            
            # Check schema
            try:
                schema = con.execute(f"DESCRIBE \"{table}\"").fetchall()
                col_names = [col[0] for col in schema]
                
                # Check for 'ts' column
                has_ts = 'ts' in col_names
                
                # Get data
                df = con.execute(f"SELECT * FROM \"{table}\"").df()
                rows = len(df)
                
                if rows == 0:
                    print(f"  Skipping empty table {table}")
                    continue

                if has_ts:
                    # --- Event Data ---
                    print(f"  Type: Event (Found 'ts' column, {rows} events)")
                    # Round ts to 3 decimals
                    df['ts_rounded'] = df['ts'].round(3)
                    
                    # For each value column, merge into master
                    # We might have duplicates at the same millisecond in source, 
                    # but for now assume we just want the value at that time.
                    # If multiple events happen at same ms, last one wins or we need aggregation.
                    # Given it's "Performance" data, usually distinct events.
                    
                    value_cols = [c for c in df.columns if c not in ['ts', 'ts_rounded'] and c not in ['value1', 'value2', 'value3', 'value4']]
                    
                    for col in value_cols:
                        # Create a series indexed by time
                        # We use a temporary DF to join
                        # But since Master is huge and Events are sparse, 
                        # we can just map the events to the nearest index in Master.
                        
                        target_col_name = f"{table}" if len(value_cols) == 1 else f"{table}_{col}"
                        
                        # Initialize with NaNs or specific default? 
                        # Events are sparse, so usually NaNs until the event?
                        # Or checking "fill to 3rd decimal" -> implying forward fill?
                        # User said: "then integrate high-precision events... individually handle these"
                        # So just placing them at the timestamp is best.
                        
                        # Use searchsorted to find indices
                        # ts_rounded is data time, master_time is grid
                        
                        # Find indices in master_time that match ts_rounded
                        # Since both are rounded to 3 decimal places, we can use searchsorted
                        
                        # Filter events within range
                        valid_events = df[(df['ts_rounded'] >= start_time) & (df['ts_rounded'] <= end_time)]
                        
                        if len(valid_events) == 0:
                           continue
                           
                        event_times = valid_events['ts_rounded'].values
                        event_values = valid_events[col].values
                        
                        # Find indices
                        # Use searchsorted. master_time is sorted.
                        idxs = np.searchsorted(master_time, event_times)
                        
                        # Verify matches (searchsorted returns insertion point, check equality)
                        # Identify valid indices within bounds
                        valid_mask = (idxs < len(master_time)) & (np.abs(master_time[np.clip(idxs, 0, len(master_time)-1)] - event_times) < 1e-5)
                        
                        final_idxs = idxs[valid_mask]
                        final_values = event_values[valid_mask]
                        
                        # Create full array initialized with NaN
                        full_series = np.full(len(master_time), np.nan, dtype=object) # Use object to support mixed types if needed, or float
                         # Try to infer type
                        if np.issubdtype(final_values.dtype, np.number):
                             full_series = np.full(len(master_time), np.nan, dtype=float)
                        
                        full_series[final_idxs] = final_values
                        fused_data[target_col_name] = full_series

                else:
                    # --- Continuous Data ---
                    # Assumption: Data is aligned with GPS Time (row-wise scaling)
                    # Instead of pure linear time (which ignores GPS jitter), we map row indices to GPS Time
                    print(f"  Type: Continuous (No 'ts', {rows} rows)")
                    
                    value_cols = [c for c in df.columns if c not in ['value1', 'value2', 'value3', 'value4']]
                    
                    # Map source rows to GPS Time
                    # indices in GPS Time = row_index * (len(gps) / len(df))
                    gps_indices = np.arange(len(gps_times)) # 0 to 51001
                    # Effective indices in GPS time for the current data
                    current_indices = np.linspace(0, len(gps_times)-1, rows)
                    
                    # Interpolate to get the exact time for each row in current df, based on GPS Time structure
                    source_time = np.interp(current_indices, gps_indices, gps_times)
                    
                    for col in value_cols:
                        target_col_name = f"{col}" if col not in fused_data else f"{table}_{col}"
                        
                        vals = df[col].values
                        
                        # Interpolate to Master Time
                        try:
                            # Check if numeric
                            # DuckDB query result columns might be object if mixed, but usually specific types
                            if np.issubdtype(vals.dtype, np.number):
                                interp_vals = np.interp(master_time, source_time, vals)
                                fused_data[target_col_name] = interp_vals
                            else:
                                print(f"  Warning: Column {col} is not numeric, skipping interpolation.")
                        except Exception as e:
                             print(f"  Error interpolation column {col}: {e}")
            
            except Exception as e:
                print(f"Error processing {table}: {e}")

        # 4. Create DataFrame and Save
        print("Creating final DataFrame...")
        final_df = pd.DataFrame(fused_data)
        
        # Add GPS Time as a column (it's the master time)
        # Actually 'Time' is already there
        
        print(f"Saving to {OUTPUT_FILE}...")
        final_df.to_parquet(OUTPUT_FILE)
        
        # print("Saving to CSV (Sample)...")
        # final_df.head(1000).to_csv(CSV_OUTPUT_FILE, index=False)
        
        print("Done!")
        
    except Exception as e:
        print(f"Global Error: {e}")
    finally:
        if 'con' in locals():
            con.close()

if __name__ == "__main__":
    main()
