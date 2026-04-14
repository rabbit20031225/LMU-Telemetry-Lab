import duckdb
import pandas as pd
import numpy as np
import os
import sys

# Add current directory to path for import
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from car_lookup import get_car_info, parse_steer_lock

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
        
        # 2. Master Index (1000Hz)
        master_time = np.arange(start_time, end_time + 0.001, 0.001)
        master_time = np.round(master_time, 3)
        print(f"Master Index: {len(master_time)} pts ({start_time:.3f} to {end_time:.3f})")
        
        # Initialize Fused Data
        fused_data = {'Time': master_time}

        # 3. Lap Reconstruction (Hybrid: Calculated Lap 1 + Native Rest)
        print("Reconstructing Laps (Hybrid)...")
        # Get Lap Starts (Native)
        lap_starts_native = con.execute("SELECT ts FROM \"Lap\" ORDER BY ts").fetchall()
        lap_starts_native = [x[0] for x in lap_starts_native]
        
        # Get First Lap Time (to calc missing boundary)
        first_lap_time = con.execute("SELECT ts, value FROM \"Lap Time\" WHERE value > 0 ORDER BY ts LIMIT 1").fetchone()
        
        final_boundaries = []
        if not lap_starts_native:
            # Fallback for empty lap table?
            final_boundaries = [start_time]
        else:
            # Start with Native Lap 0 (Session Start/Out Lap)
            # Usually the first entry, e.g. 26.535
            final_boundaries.append(lap_starts_native[0])
            
            # Calculate Missing Lap 1 Start
            if first_lap_time:
                lap1_end = first_lap_time[0]
                lap1_dur = first_lap_time[1]
                calc_start = lap1_end - lap1_dur
                
                # Insert if it falls between Lap 0 and Lap 1(Native)
                # Check if we have a second native point (Lap 1 indicator)
                if len(lap_starts_native) > 1:
                    native_lap1 = lap_starts_native[1]
                    # If calc_start is significantly before native_lap1 and after initial
                    if calc_start < native_lap1 - 1.0 and calc_start > final_boundaries[0] + 1.0:
                        final_boundaries.append(calc_start)
                        print(f"  Inserted Calculated Lap Boundary: {calc_start:.3f}")
                else:
                     # Only one native point? Append calc start if valid
                     if calc_start > final_boundaries[0] + 1.0:
                         final_boundaries.append(calc_start)
            
            # Append the rest of Native Laps (Lap 1, 2, ...)
            # Basically everything from index 1 onwards
            final_boundaries.extend(lap_starts_native[1:])

        # Ensure sorted and unique
        final_boundaries = sorted(list(set(final_boundaries)))
        
        # Ensure Start Time is a boundary (Lap 0) if not covered
        if not final_boundaries or (final_boundaries[0] - start_time > 1.0):
             final_boundaries.insert(0, start_time)
             
        print(f"Identified {len(final_boundaries)} Lap Boundaries: {[round(b, 2) for b in final_boundaries]}")
        
        # Create Lap Number Channel (Fill)
        lap_channel = np.zeros(len(master_time))
        current_lap = 0
        for i in range(len(final_boundaries)):
            boundary_time = final_boundaries[i]
            # Next boundary or End
            next_boundary = final_boundaries[i+1] if i+1 < len(final_boundaries) else end_time + 1.0
            
            mask = (master_time >= boundary_time) & (master_time < next_boundary)
            lap_channel[mask] = current_lap
            current_lap += 1
            
        fused_data['Lap'] = lap_channel

        # 4. Lap Dist Calculation (Integration)
        print("Calculating Lap Dist from GPS Speed...")
        gps_speed_df = con.execute("SELECT value FROM \"GPS Speed\" ORDER BY rowid").df()
        gps_speed_raw = gps_speed_df['value'].values
        
        # Check Unit
        max_speed = np.max(gps_speed_raw)
        if max_speed > 150:
            print(f"  Detected GPS Speed in km/h (Max: {max_speed:.2f}). Converting to m/s.")
            gps_speed_ms = gps_speed_raw / 3.6
        else:
            print(f"  Detected GPS Speed in m/s (Max: {max_speed:.2f}).")
            gps_speed_ms = gps_speed_raw
            
        # Interpolate Speed to Master (for Integration)
        # Use GPS Time mapping logic for alignment
        gps_indices = np.arange(len(gps_times))
        current_indices = np.linspace(0, len(gps_times)-1, len(gps_speed_ms))
        source_time_speed = np.interp(current_indices, gps_indices, gps_times)
        
        speed_master = np.interp(master_time, source_time_speed, gps_speed_ms)
        
        # Integrate (dt = 0.001)
        dist_cumulative = np.cumsum(speed_master * 0.001)
        
        # Apply Reset at Boundaries
        lap_dist_channel = np.zeros(len(master_time))
        
        # Get Initial Offset from original Lap Dist table
        try:
            initial_dist_row = con.execute("SELECT value FROM \"Lap Dist\" ORDER BY rowid LIMIT 1").fetchone()
            initial_offset = initial_dist_row[0] if initial_dist_row else 0.0
            print(f"  Initial Lap Dist Offset: {initial_offset:.2f} m")
        except Exception as e:
            print(f"  Warning: Could not read initial Lap Dist ({e}). Defaulting to 0.")
            initial_offset = 0.0

        for i in range(len(final_boundaries)):
            boundary_time = final_boundaries[i]
            next_boundary = final_boundaries[i+1] if i+1 < len(final_boundaries) else end_time + 1.0
            
            # Find index of boundary
            idx_start = np.searchsorted(master_time, boundary_time)
            idx_end = np.searchsorted(master_time, next_boundary)
            
            if idx_start < len(master_time):
                base_dist = dist_cumulative[idx_start]
                segment = dist_cumulative[idx_start:idx_end] - base_dist
                # Clip negative (noise?)
                segment = np.maximum(segment, 0)
                
                # Apply initial offset ONLY to the first lap (Lap 0)
                if i == 0:
                    segment += initial_offset
                
                # Check valid length
                eff_len = min(len(segment), len(lap_dist_channel[idx_start:idx_end]))
                lap_dist_channel[idx_start:idx_start+eff_len] = segment[:eff_len]
                
                fused_data['Lap Dist'] = lap_dist_channel
                
        # 4a. Lap Dist Normalization
        TRACK_LENGTH_REF = 5823.4168
        print(f"Normalizing Lap Dist to Track Length: {TRACK_LENGTH_REF:.4f} m...")
        
        for i in range(len(final_boundaries)):
            boundary_time = final_boundaries[i]
            next_boundary = final_boundaries[i+1] if i+1 < len(final_boundaries) else end_time + 1.0
            
            # Find indices
            idx_start = np.searchsorted(master_time, boundary_time)
            idx_end = np.searchsorted(master_time, next_boundary)
            
            # Skip empty
            if idx_end <= idx_start: continue
            
            # Check if last segment (Incomplete Lap?)
            is_last_segment = (i == len(final_boundaries) - 1)
            
            # For the last segment, we only normalize if we are sure it's complete.
            # But here 'last segment' is likely the incomplete lap (e.g. Lap 4).
            # So we skip normalization for the last segment.
            if is_last_segment:
                print(f"  Skipping normalization for incomplete last lap (Lap {i})")
                continue
                
            # Get current end distance 
            segment_view = lap_dist_channel[idx_start:idx_end]
            current_end_dist = segment_view[-1]
            
            if current_end_dist > 100: # Avoid div/0
                scale_factor = TRACK_LENGTH_REF / current_end_dist
                # Apply in place
                lap_dist_channel[idx_start:idx_end] *= scale_factor
                # Force exact end value for precision?
                # segment_view[-1] = TRACK_LENGTH_REF # Optional, but mult is likely enough
                print(f"  Lap {i}: Raw={current_end_dist:.2f}m -> Norm={TRACK_LENGTH_REF:.2f}m (k={scale_factor:.6f})")

        fused_data['Lap Dist'] = lap_dist_channel

        # 4b. Gear Logic (Initial Inference + Step Function)
        print("Processing Gear...")
        try:
            gear_df = con.execute("SELECT ts, value FROM \"Gear\" ORDER BY ts").df()
            if not gear_df.empty:
                gear_ts = gear_df['ts'].values
                gear_vals = gear_df['value'].values
                
                # Inference Logic
                initial_gear = 0.0
                if len(gear_vals) >= 2:
                    val0 = gear_vals[0]
                    val1 = gear_vals[1]
                    # User Rule: if 0 -> 2, start was 1. Generalize to: if 0 -> N, start was N-1
                    if val0 == 0 and val1 > 0:
                        initial_gear = float(val1 - 1)
                        print(f"  Inferred Initial Gear: {initial_gear} (from sequence {val0}->{val1})")
                    else:
                        initial_gear = float(val0)
                        print(f"  Using First Gear Value: {initial_gear}")
                elif len(gear_vals) == 1:
                    initial_gear = float(gear_vals[0])
                
                # Create Channel (Step Function)
                gear_channel = np.full(len(master_time), initial_gear, dtype=float)
                
                # Map events
                # Round event times to 3 decimals to match master
                # Or use searchsorted
                
                idxs = np.searchsorted(master_time, gear_ts)
                
                # Iterate and fill forward
                # Optimization: Use np.split or similar?
                # Actually, simply iterating events and filling to end (or next event) is robust
                
                # Better approach for Step Function:
                # 1. Create array of indices and values
                # 2. Iterate
                
                current_val = initial_gear
                last_idx = 0
                
                for i in range(len(idxs)):
                    idx = idxs[i]
                    val = gear_vals[i]
                    
                    # Fill from last_idx to current idx with current_val
                    # Wait, master_time[idx] is >= gear_ts[i].
                    # So at idx, the value changes to `val`.
                    # Before idx, it was `current_val`.
                    
                    if idx > last_idx:
                        # gear_channel[last_idx:idx] is already set to correct value by forward filling?
                        # No, let's fill forward.
                        pass # Already initialized to initial_gear? No, array initialized to initial_gear.
                        
                        # Actually simpler:
                        # Initialize all to initial_gear.
                        # For each event i: set gear_channel[idx:] = val
                        # Since we iterate in order, this overwrites subsequent values correctly.
                        # This is O(N*M) worst case but N events is small.
                        pass
                
                # Vectorized Step Function using broadcast/cumsum?
                # No, standard step function approach:
                # Use searchsorted to find where each master time falls in event times
                
                # 1. Add -inf time with initial value?
                # event_times = [-1.0] + list(gear_ts)
                # event_values = [initial_gear] + list(gear_vals)
                # indices = np.searchsorted(event_times, master_time, side='right') - 1
                # gear_channel = np.array(event_values)[indices]
                
                # Yes, this is the standard way.
                
                # Prepare events
                # Note: gear_ts values might be outside master_time range?
                # Add a dummy start event at -1.0s with initial_gear
                
                effective_ts = np.concatenate(([-1.0], gear_ts))
                effective_vals = np.concatenate(([initial_gear], gear_vals))
                
                # Use side='right' so that if master_time == ts, index is the one *after*, -1 gives the index of ts.
                # So at t=ts, we get the new value.
                indices = np.searchsorted(effective_ts, master_time, side='right') - 1
                gear_channel = effective_vals[indices]
                
                fused_data['Gear'] = gear_channel
            else:
                 print("  Gear table empty.")
        except Exception as e:
            print(f"  Error processing Gear: {e}")

        # 4c. Steering Angle Calibration
        print("Calibrating Steering Angle...")
        try:
            # Get Car Name/Class from Metadata Table
            # Metadata table has key, value columns
            meta_rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('CarName', 'CarClass', 'CarSetup')").fetchall()
            meta_dict = {k: v for k, v in meta_rows}
            
            car_name = meta_dict.get('CarName', 'Unknown')
            car_class = meta_dict.get('CarClass', 'Unknown')
            
            print(f"  Metadata Car: {car_name} ({car_class})")
            
            # Try to extract steering lock from metadata
            meta_steer_lock = None
            try:
                if 'CarSetup' in meta_dict:
                    import json
                    car_setup = json.loads(meta_dict['CarSetup'])
                    if 'VM_STEER_LOCK' in car_setup:
                        s_val = car_setup['VM_STEER_LOCK'].get('stringValue', '')
                        meta_steer_lock = parse_steer_lock(s_val)
                        if meta_steer_lock:
                            print(f"  Extracted Steering Lock from Metadata: {meta_steer_lock}")
            except: pass

            # Lookup
            real_name, steering_lock = get_car_info(car_name, car_class, override_steer_lock=meta_steer_lock)
            print(f"  Identified Real Car: {real_name}")
            print(f"  Steering Lock: {steering_lock} degrees")
            
            # Save relevant info to fused_data metadata attributes? Parquet supports it but complex.
            # We will save it to session_metadata.json later in create_summary script? 
            # Or just print it here.
            # Actually, let's add it to the dataframe as a constant column? Waste of space.
            # Better: Append to metadata table if we were updating it.
            # But we are reading from DB.
            # We can print it and let extract_session_summary handle it?
            # No, extract_session_summary reads from DB.
            # We should probably update session_metadata.json *here* or in previous step.
            
            # Calculate Steering Angle
            # Formula: Steering Pos * (Lock / 2)
            # Assuming Steering Pos is -1 to 1?
            # Check Steering Pos exists
            # It's processed in loop below. But we need to know if it's there.
            # Actually, loop below (Step 5) processes all tables.
            # We will calculate Steering Angle AFTER Step 5.
            
        except Exception as e:
            print(f"  Error in Steering Calibration: {e}")
            real_name = "Unknown"
            steering_lock = 480 # Default

        # 5. Process Other Tables
        tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
        
        # Exclusions
        skip_tables = [
            'GPS Time', 'metadata', 'channelsList', 'eventsList', 'Session Info',
            # Special Handling (Created Manually)
            'Lap', 'Lap Time', 'Lap Dist', 'GPS Speed', 'Gear',
            # User Filters
             'AntiStall Activated', 'Best LapTime', 'Best Sector1', 'Best Sector2', 
            'CloudDarkness', 'Engine Max RPM', 'Headlights State',
            'Brakes Air Temp', 'Clutch RPM', 'FFB Output', 'Steering Pos Unfiltered', 
            'Steering Shaft Torque', 'SurfaceTypes', 'Throttle Pos Unfiltered', 
            'Time Behind Next', 'Wheel Speed', 'WheelsDetached', 'Wind Heading', 'Wind Speed',
            'Brake Pos Unfiltered', 'Clutch Pos Unfiltered', 'Front3rdDeflection',
            'RearFlapActivated', 'Rear3rdDeflection', 'Regen Rate', 
            'RearFlapLegalStatus'
        ]
        
        for table in tables:
            if table in skip_tables:
                continue
                
            print(f"Processing {table}...")
            # Check for ts
            cols = [c[0] for c in con.execute(f"DESCRIBE \"{table}\"").fetchall()]
            has_ts = 'ts' in cols
            
            df = con.execute(f"SELECT * FROM \"{table}\"").df()
            rows = len(df)
            if rows == 0: continue
            
            # Column Filter (value1..4)
            value_cols = [c for c in df.columns if c not in ['ts', 'value1', 'value2', 'value3', 'value4']]
            if not value_cols: continue
            
            if has_ts:
                # Event
                df['ts_rounded'] = df['ts'].round(3)
                valid_events = df[(df['ts_rounded'] >= start_time) & (df['ts_rounded'] <= end_time)]
                if len(valid_events) == 0: continue
                
                event_times = valid_events['ts_rounded'].values
                
                # Searchsorted for matching times
                idxs = np.searchsorted(master_time, event_times)
                # Exact match check
                valid_mask = (idxs < len(master_time)) & (np.abs(master_time[np.clip(idxs, 0, len(master_time)-1)] - event_times) < 1e-5)
                
                final_idxs = idxs[valid_mask]
                
                for col in value_cols:
                    event_values = valid_events[col].values
                    # Rename 'value' to table name to avoid ambiguity
                    if col == 'value':
                        target_name = table
                    else:
                        target_name = col
                    
                    # Handle collision
                    if target_name in fused_data:
                         target_name = f"{table}_{col}"
                    
                    full_series = np.full(len(master_time), np.nan, dtype=float)
                    full_series[final_idxs] = event_values[valid_mask]
                    fused_data[target_name] = full_series
            else:
                # Continuous
                # Time Mapping
                current_indices = np.linspace(0, len(gps_times)-1, rows)
                source_time = np.interp(current_indices, np.arange(len(gps_times)), gps_times)
                
                for col in value_cols:
                    vals = df[col].values
                    # Rename 'value' to table name
                    if col == 'value':
                        target_name = table
                    else:
                        target_name = col
                        
                    # Handle collision
                    if target_name in fused_data:
                        target_name = f"{table}_{col}"
                    
                    if np.issubdtype(vals.dtype, np.number):
                        interp_vals = np.interp(master_time, source_time, vals)
                        fused_data[target_name] = interp_vals

        # 5b. Post-Process Steering Angle
        if 'Steering Pos' in fused_data:
            print(f"  Calculating Steering Angle (Lock={steering_lock})...")
            # Create new column 'Steering Angle'
            # Pos is approx -1 to 1 (or -1.5, etc depending on car).
            # If Normalized: Angle = Pos * (Lock / 2)
            # If Raw (Radians/Degrees): Check range.
            # Range check:
            steer_pos = fused_data['Steering Pos']
            max_val = np.nanmax(np.abs(steer_pos))
            if max_val <= 2.0: # Likely normalized or raw small value
                 fused_data['Steering Angle'] = steer_pos * (steering_lock / 2)
            else:
                 # Already in degrees?
                 print(f"  Steering Pos max {max_val:.2f} > 2.0. Assuming already Angle?")
                 fused_data['Steering Angle'] = steer_pos # Copy
                 
        # 5c. Update Metadata File with Real Car Name?
        # We can write a small JSON sidecar or update existing one?
        # Let's save a "fused_metadata.json"
        import json
        fused_meta = {
             "RealCarName": real_name,
             "SteeringLock": steering_lock
        }
        with open('fused_metadata.json', 'w') as f:
             json.dump(fused_meta, f, indent=4)
        print("  Saved fused_metadata.json")

        # 6. Save
        print("Saving Parquet...")
        final_df = pd.DataFrame(fused_data)
        final_df.to_parquet(OUTPUT_FILE)
        
        # Save CSV for ease of use
        csv_path = OUTPUT_FILE.replace('.parquet', '.csv')
        print(f"Saving CSV to {csv_path}...")
        final_df.to_csv(csv_path, index=False)
        print("Done.")

    except Exception as e:
        print(f"Global Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'con' in locals():
            con.close()

if __name__ == "__main__":
    main()
