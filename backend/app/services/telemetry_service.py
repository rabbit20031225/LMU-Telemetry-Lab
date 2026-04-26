
import duckdb
import pandas as pd
import numpy as np
import os
import logging
from .car_lookup import get_car_info, parse_steer_lock

logger = logging.getLogger(__name__)

class TelemetryService:
    @staticmethod
    def get_laps_header(db_path: str) -> dict:
        """
        Efficiently retrieves lap boundaries and basic stats without full fusion.
        Returns a dict:
        {
            "laps": [
                {"lap": 0, "startTime": 0.0, "endTime": 125.4, "duration": 125.4, "isValid": False},
                ...
            ],
            "metadata": {
                "trackName": "Autodromo Nazionale Monza",
                "carName": "McLaren 720S GT3 Evo",
                "carClass": "LMGT3",
                "teamName": "United Autosports",
                "driverName": "J.Smith"
            }
        }
        """
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Database not found: {db_path}")

        con = duckdb.connect(db_path, read_only=True)
        try:
            # 1. Get Session Boundaries (GPS Time)
            gps_range = con.execute("SELECT min(value), max(value) FROM \"GPS Time\"").fetchone()
            start_time, end_time = gps_range[0], gps_range[1]
            
            # 2. Get Lap starts
            lap_starts_native = [x[0] for x in con.execute("SELECT ts FROM \"Lap\" ORDER BY ts").fetchall()]
            
            # 3. Get Lap Times (for validation/duration)
            lap_times = con.execute("SELECT ts, value FROM \"Lap Time\" WHERE value > 0 ORDER BY ts").fetchall()
            
            final_boundaries = []
            if not lap_starts_native:
                final_boundaries = [start_time]
            else:
                final_boundaries.append(lap_starts_native[0])
                # Check for Lap 1 calc (same logic as fusion)
                first_valid_lap = next((x for x in lap_times if x[1] > 0), None)
                if first_valid_lap:
                    lap1_end, lap1_dur = first_valid_lap
                    calc_start = lap1_end - lap1_dur
                    if len(lap_starts_native) > 1:
                        if calc_start < lap_starts_native[1] - 1.0 and calc_start > final_boundaries[0] + 1.0:
                             final_boundaries.append(calc_start)
                    else:
                        if calc_start > final_boundaries[0] + 1.0:
                             final_boundaries.append(calc_start)
                
                final_boundaries.extend(lap_starts_native[1:])
            
            final_boundaries = sorted(list(set(final_boundaries)))
            if not final_boundaries or (final_boundaries[0] - start_time > 1.0):
                 final_boundaries.insert(0, start_time)
            
            # 4. Get Sector Times (Last Sector1, Last Sector2)
            try:
                s1_events = con.execute("SELECT ts, value FROM \"Last Sector1\" ORDER BY ts").fetchall()
                s2_events = con.execute("SELECT ts, value FROM \"Last Sector2\" ORDER BY ts").fetchall()
            except:
                s1_events = []
                s2_events = []
                logger.warning("Sector tables not found")

            # Helper for ASOF lookup with time window
            def get_last_value(events, t_query, t_min):
                val = None
                for ts, v in events:
                    if ts > t_query:
                        break
                    if ts > t_min:
                        val = v
                return val

            # Load "In Pits" for Stint mapping
            try:
                in_pits_events = con.execute("SELECT ts, value FROM \"In Pits\" ORDER BY ts").fetchall()
            except:
                in_pits_events = []
                logger.warning("In Pits table not found")

            # Load "Fuel Level" for fuel consumption tracking
            try:
                gps_times = con.execute("SELECT value FROM \"GPS Time\" ORDER BY rowid").df()['value'].values
                fuel_df = con.execute("SELECT value FROM \"Fuel Level\" ORDER BY rowid").df()
                fuel_vals = fuel_df['value'].values
                # Fuel Level is continuous, interpolate time against gps_times
                current_indices = np.linspace(0, len(gps_times)-1, len(fuel_vals))
                fuel_ts = np.interp(current_indices, np.arange(len(gps_times)), gps_times)
            except:
                fuel_ts = []
                fuel_vals = []
                logger.warning("Fuel Level table not found or mapping failed")

            # Construct Laps List
            laps = []
            current_stint = 1
            
            for i in range(len(final_boundaries)):
                t_start = final_boundaries[i]
                t_end = final_boundaries[i+1] if i+1 < len(final_boundaries) else end_time
                
                duration = t_end - t_start
                matched_time = next((x[1] for x in lap_times if abs(x[0] - t_end) < 0.5), None)
                
                s1_val = get_last_value(s1_events, t_end, t_start)
                s2_val = get_last_value(s2_events, t_end, t_start)
                
                s1_split = None
                s2_split = None
                s3_split = None
                
                valid_lap_dur = matched_time if matched_time else duration

                if s1_val:
                    s1_split = float(s1_val)
                    if s2_val:
                        s2_split = float(s2_val) - float(s1_val)
                        if valid_lap_dur:
                            s3_split = float(valid_lap_dur) - float(s2_val)
                
                # Check if car was in pits during this lap
                in_pit = False
                for p_ts, p_val in in_pits_events:
                    if p_ts >= t_end:
                        break
                    if p_ts >= t_start and p_val > 0.5:
                        in_pit = True
                        break
                
                # Calculate Fuel Usage
                start_fuel = 0.0
                end_fuel = 0.0
                if len(fuel_ts) > 0:
                    idx_start = np.searchsorted(fuel_ts, t_start)
                    idx_end = np.searchsorted(fuel_ts, t_end)
                    if idx_start < len(fuel_vals):
                        start_fuel = float(fuel_vals[idx_start])
                    if idx_end > 0 and idx_end <= len(fuel_vals):
                        end_fuel = float(fuel_vals[idx_end - 1])
                
                lap_fuel_used = max(0.0, start_fuel - end_fuel)
                
                is_out_lap = (i == 0) or (len(laps) > 0 and laps[-1].get('inPit', False))
                
                laps.append({
                    "lap": i,
                    "startTime": float(t_start),
                    "endTime": float(t_end),
                    "duration": float(valid_lap_dur),
                    "isValid": True if matched_time else False, 
                    "isOutLap": is_out_lap,
                    "inPit": in_pit,
                    "fuelUsed": lap_fuel_used,
                    "s1": s1_split,
                    "s2": s2_split,
                    "s3": s3_split,
                    "stint": current_stint
                })
                
                # If we entered pits this lap, the NEXT lap starts a new stint
                if in_pit:
                    current_stint += 1
            
            # 5. Fetch Metadata
            meta_dict = {}
            fuel_capacity = 0.0
            tyre_compound_max = 0
            try:
                meta_rows = con.execute("SELECT key, value FROM metadata").fetchall()
                meta_dict = {k: v for k, v in meta_rows}
                
                import json
                try:
                    if 'CarConfig' in meta_dict:
                        car_config = json.loads(meta_dict['CarConfig'])
                        fuel_capacity = float(car_config.get('fuelCapacity', 0.0))
                    elif 'CarSetup' in meta_dict:
                        car_setup = json.loads(meta_dict['CarSetup'])
                        
                        # Extract Tyre Compound Threshold
                        if 'VM_FRONT_TIRE_COMPOUND' in car_setup:
                            tyre_compound_max = car_setup['VM_FRONT_TIRE_COMPOUND'].get('maxValue', 0)
                        elif 'VM_REAR_TIRE_COMPOUND' in car_setup:
                            tyre_compound_max = car_setup['VM_REAR_TIRE_COMPOUND'].get('maxValue', 0)

                        # LMU/rFactor2 style fuel capacity
                        if 'VM_FUEL_CAPACITY' in car_setup:
                            val_obj = car_setup['VM_FUEL_CAPACITY']
                            if isinstance(val_obj, dict):
                                # LMU uses "93.0L (0.0 laps)". 
                                s_val = val_obj.get('stringValue', val_obj.get('lastSavedStringValue', ''))
                                import re
                                match = re.search(r'([\d.]+)', s_val)
                                if match:
                                    fuel_capacity = float(match.group(1))
                                else:
                                    fuel_capacity = float(val_obj.get('value', 0.0))
                            else:
                                fuel_capacity = float(val_obj)
                except Exception as e:
                    logger.warning(f"Failed to parse metadata: {e}")
            except:
                pass
            
            # Extract Steering Lock from Metadata
            meta_steer_lock = None
            meta_steer_lock_str = None
            try:
                if "CarSetup" in meta_dict:
                    car_setup = json.loads(meta_dict["CarSetup"])
                    if "VM_STEER_LOCK" in car_setup:
                        s_val = car_setup["VM_STEER_LOCK"].get("stringValue", "")
                        meta_steer_lock_str = s_val
                        meta_steer_lock = parse_steer_lock(s_val)
                        if meta_steer_lock:
                            logger.info(f"Extracted Steering Lock from Metadata: {meta_steer_lock} ({s_val})")
            except Exception as e:
                logger.warning(f"Failed to extract steer lock from metadata: {e}")
            
            # Mapping Logic based on User Request (Update 2):
            # 1. DriverName -> "Eason Hung" (Bottom)
            # 2. TrackName -> Top
            # 3. TrackLayout -> Under Track
            # 4. CarClass -> Badge
            # 5. ModelName -> Derived from CarName (Middle)
            # 6. RawCarName -> Small under Model
            
            raw_track = meta_dict.get('TrackName', 'Unknown Track')
            raw_layout = meta_dict.get('TrackLayout', '')
            raw_car = meta_dict.get('CarName', 'Unknown Car')
            raw_class = meta_dict.get('CarClass', 'Unknown Class')
            raw_driver = meta_dict.get('DriverName', 'Unknown Driver')
            session_time = meta_dict.get('SessionTime', 'Unknown Time')
            session_type = meta_dict.get('SessionType', 'Unknown Session')
            weather_cond = meta_dict.get('WeatherConditions', 'Unknown Weather')
            
            # --- Calculate Session Duration (Max - Min GPS Time) ---
            session_duration = 0
            try:
                gps_time_range = con.execute('SELECT MIN(value), MAX(value) FROM "GPS Time"').fetchone()
                if gps_time_range and gps_time_range[0] is not None and gps_time_range[1] is not None:
                    session_duration = float(gps_time_range[1]) - float(gps_time_range[0])
            except Exception as e:
                logger.warning(f"Failed to calculate session duration: {e}")
            
            # Lookup Model Name from Raw Car Name
            real_car_name, final_steer_lock = get_car_info(raw_car, raw_class, override_steer_lock=meta_steer_lock)
            
            # --- Enrich Track Metadata from Registry ---
            from ..utils.track_db import find_track_in_registry
            matched_key, track_data = find_track_in_registry(raw_track)
            common_track_name = matched_key if matched_key else raw_track
            track_country = track_data.get("country", "") if matched_key else ""
            track_aliases = track_data.get("aliases", []) if matched_key else []

            # --- Calculate Sector Lines (Lat/Lon) based on Fastest Valid Lap ---
            sector_lines = []
            try:
                # Find fastest valid lap
                valid_laps = [l for l in laps if l['isValid'] and l['s1'] and l['s2']]
                if valid_laps:
                    best_lap = min(valid_laps, key=lambda x: x['duration'])
                    t_start = best_lap['startTime']
                    # Sector 1 End Timestamp
                    t1 = t_start + best_lap['s1']
                    # Sector 2 End Timestamp
                    t2 = t_start + best_lap['s1'] + best_lap['s2']
                    
                    # Load GPS Time if not already loaded (Optimized to load once)
                    try:
                        gps_time_df = con.execute('SELECT value FROM "GPS Time" ORDER BY rowid').df()
                        gps_times_full = gps_time_df['value'].values
                        
                        def get_gps_at(ts_target):
                            # Find nearest index in gps_times
                            idx = np.searchsorted(gps_times_full, ts_target)
                            idx = min(idx, len(gps_times_full) - 1)
                            
                            # RowID is 1-indexed in DuckDB but our idx is 0-indexed
                            rowid = idx + 1
                            
                            row = con.execute(f"""
                                SELECT 
                                    (SELECT value FROM "GPS Latitude" WHERE rowid={rowid}) as lat,
                                    (SELECT value FROM "GPS Longitude" WHERE rowid={rowid}) as lon
                            """).fetchone()
                            return row
                            
                        p1 = get_gps_at(t1)
                        p2 = get_gps_at(t2)
                    except Exception as inner_e:
                        logger.warning(f"Failed to fetch GPS data using rowid mapping: {inner_e}")
                        p1, p2 = None, None
                    
                    if p1 and p1[0] and p1[1]:
                        sector_lines.append({'lat': float(p1[0]), 'lon': float(p1[1]), 'id': 1})
                    if p2 and p2[0] and p2[1]:
                        sector_lines.append({'lat': float(p2[0]), 'lon': float(p2[1]), 'id': 2})
            except Exception as e:
                logger.error(f"Error calculating sector lines: {e}")

            metadata = {
                "trackName": raw_track,
                "commonTrackName": common_track_name,
                "trackAliases": track_aliases,
                "country": track_country,
                "trackLayout": raw_layout,
                "carClass": raw_class,
                "modelName": real_car_name,
                "rawCarName": raw_car,
                "driverName": raw_driver,
                "sessionTime": session_time,
                "sessionDuration": session_duration,
                "sessionType": session_type,
                "weather": weather_cond,
                "trackSectors": sector_lines, # List of {lat, lon, id}
                "fuelCapacity": fuel_capacity,
                "tyreCompoundMax": tyre_compound_max,
                "steeringLock": final_steer_lock,
                "steeringLockString": meta_steer_lock_str
            }
            
            return {"laps": laps, "metadata": metadata}
            
        finally:
            con.close()

    @staticmethod
    def fuse_session_data(db_path: str, output_parquet: str = None, target_freq: int = 60, trim_start_time: float = None, trim_end_time: float = None) -> pd.DataFrame:
        """
        Fuses DuckDB telemetry data into a single DataFrame at the specified target frequency.
        Returns the DataFrame. Optionally saves to Parquet.
        """
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Database not found: {db_path}")

        logger.info(f"Connecting to {db_path}...")
        con = duckdb.connect(db_path, read_only=True)
        
        # Calculate dynamic time delta
        dt = 1.0 / target_freq
        
        try:
            # 0. Fetch Metadata for Elevation/Calibration
            meta_rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('TrackName', 'TrackLayout')").fetchall()
            meta_map = {k: v for k, v in meta_rows}
            track_name = meta_map.get('TrackName')
            track_layout = meta_map.get('TrackLayout')
            # 1. Load Reference Time (GPS Time)
            logger.info("Loading GPS Time...")
            gps_time_df = con.execute("SELECT value FROM \"GPS Time\" ORDER BY rowid").df()
            if gps_time_df.empty:
                raise ValueError("GPS Time table is empty.")
                
            gps_times = gps_time_df['value'].values
            
            # Apply Trimming
            start_time = trim_start_time if trim_start_time is not None else gps_times[0]
            end_time = trim_end_time if trim_end_time is not None else gps_times[-1]
            
            # Ensure bounds are within actual data
            start_time = max(start_time, gps_times[0])
            end_time = min(end_time, gps_times[-1])
            
            # 2. Master Index (Dynamic Frequency)
            master_time = np.arange(start_time, end_time + dt, dt)
            master_time = np.round(master_time, 3)
            logger.info(f"Master Index: {len(master_time)} pts ({start_time:.3f} to {end_time:.3f} @ {target_freq}Hz)")
            
            fused_data = {'Time': master_time}

            # 3. Lap Reconstruction (Hybrid)
            logger.info("Reconstructing Laps (Hybrid)...")
            lap_starts_native = [x[0] for x in con.execute("SELECT ts FROM \"Lap\" ORDER BY ts").fetchall()]
            
            first_lap_time = con.execute("SELECT ts, value FROM \"Lap Time\" WHERE value > 0 ORDER BY ts LIMIT 1").fetchone()
            
            final_boundaries = []
            if not lap_starts_native:
                final_boundaries = [start_time]
            else:
                # Lap 0 (Out Lap)
                final_boundaries.append(lap_starts_native[0])
                
                # Calc Missing Lap 1
                if first_lap_time:
                    lap1_end = first_lap_time[0]
                    lap1_dur = first_lap_time[1]
                    calc_start = lap1_end - lap1_dur
                    
                    if len(lap_starts_native) > 1:
                        native_lap1 = lap_starts_native[1]
                        if calc_start < native_lap1 - 1.0 and calc_start > final_boundaries[0] + 1.0:
                            final_boundaries.append(calc_start)
                            logger.info(f"Inserted Calculated Lap Boundary: {calc_start:.3f}")
                    else:
                        if calc_start > final_boundaries[0] + 1.0:
                             final_boundaries.append(calc_start)
                
                # Append rest
                final_boundaries.extend(lap_starts_native[1:])

            final_boundaries = sorted(list(set(final_boundaries)))
            if not final_boundaries or (final_boundaries[0] - start_time > 1.0):
                 final_boundaries.insert(0, start_time)
            
            # Create Lap Channel
            lap_channel = np.zeros(len(master_time))
            current_lap = 0
            for i in range(len(final_boundaries)):
                boundary_time = final_boundaries[i]
                next_boundary = final_boundaries[i+1] if i+1 < len(final_boundaries) else end_time + 1.0
                mask = (master_time >= boundary_time) & (master_time < next_boundary)
                lap_channel[mask] = current_lap
                current_lap += 1
            fused_data['Lap'] = lap_channel

            # 4. Lap Dist Calculation / Alignment
            # Note: We now allow 'Lap Dist' to be loaded from DB in step 7. 
            # We defer this block to AFTER step 7? No, step 7 is dependent on fused_data? 
            # Step 7 writes TO fused_data. So we should move this block to AFTER step 7 
            # or check if we can load it here.
            
            # Let's load 'Lap Dist' explicitly here if possible.
            # Let's load 'Lap Dist' explicitly here if possible.

            # 4. Lap Dist Calculation (Final: Speed Integration + Dynamic Normalization)
            # User selected "sebring_debug_dump" logic (Dynamic Ref Length).
            # Logic:
            # 1. Integrate Speed -> Cumulative Distance
            # 2. Slice by Lap Boundaries -> Raw Segments
            # 3. Determine Track Length (Reference) = Median of Full Laps
            # 4. Normalize Full Laps to Reference

            # A. Load Speed
            speed_table = "Ground Speed"
            try:
                con.execute(f"SELECT count(*) FROM \"{speed_table}\"")
                speed_df = con.execute(f"SELECT value FROM \"{speed_table}\" ORDER BY rowid").df()
            except:
                logger.warning("Ground Speed not found, falling back to GPS Speed")
                speed_table = "GPS Speed"
                speed_df = con.execute(f"SELECT value FROM \"{speed_table}\" ORDER BY rowid").df()
            
            speed_vals = speed_df['value'].values
            
            # Check units
            max_v = np.max(speed_vals)
            if max_v > 150: # km/h detection
                speed_ms_src = speed_vals / 3.6
            else:
                speed_ms_src = speed_vals

            # B. Interpolate Speed to Master Time
            src_indices = np.linspace(0, len(gps_times)-1, len(speed_ms_src))
            source_time_speed = np.interp(src_indices, np.arange(len(gps_times)), gps_times)
            speed_master = np.interp(master_time, source_time_speed, speed_ms_src)
            
            # C. Integrate using dynamic dt
            dist_cumulative = np.cumsum(speed_master * dt)

            # D. Get Initial Offset
            initial_offset = 0.0
            try:
                 offset_row = con.execute("SELECT value FROM \"Lap Dist\" ORDER BY rowid LIMIT 1").fetchone()
                 if offset_row: initial_offset = offset_row[0]
            except: pass

            # E. Slice Segments
            lap_dist_channel = np.zeros(len(master_time))
            raw_segments = []
            segment_indices = []
            
            for i in range(len(final_boundaries)):
                boundary_start = final_boundaries[i]
                boundary_end = final_boundaries[i+1] if i+1 < len(final_boundaries) else end_time + 1.0
                
                idx_start = np.searchsorted(master_time, boundary_start)
                idx_end = np.searchsorted(master_time, boundary_end)
                
                if idx_start < len(master_time):
                    # Slice Cumulative
                    base_dist = dist_cumulative[idx_start]
                    seg_len = min(idx_end, len(dist_cumulative)) - idx_start
                    if seg_len <= 0:
                        raw_segments.append(np.array([]))
                        segment_indices.append((idx_start, idx_start))
                        continue
                        
                    segment = dist_cumulative[idx_start:idx_start+seg_len] - base_dist
                    segment = np.maximum(segment, 0)
                    if i == 0: segment += initial_offset
                    
                    raw_segments.append(segment)
                    segment_indices.append((idx_start, idx_start+seg_len))
                    
                    lap_dist_channel[idx_start:idx_start+seg_len] = segment
                else:
                    raw_segments.append(np.array([]))
                    segment_indices.append((idx_start, idx_start))

            # F. Determine Reference Track Length (Dynamic)
            valid_lengths = []
            for i, seg in enumerate(raw_segments):
                if len(seg) == 0: continue
                # Skip L0 (Out Lap) and Last Lap (if incomplete)
                # Heuristic: Valid full lap is usually ~6000m for Sebring.
                # Let's collect all reasonable lengths > 4000m
                if seg[-1] > 4000:
                    valid_lengths.append(seg[-1])
            
            if valid_lengths:
                track_length_ref = np.median(valid_lengths)
                logger.info(f"Dynamic Reference Length (Median): {track_length_ref:.2f}m")
            else:
                track_length_ref = 6019.0 # Fallback
                logger.warning("No valid full laps found for Ref Length. Using fallback 6019m.")

            # G. Normalize
            for i, segment in enumerate(raw_segments):
                if len(segment) == 0: continue
                
                idx_start, idx_end = segment_indices[i]
                current_end_dist = segment[-1]
                
                if current_end_dist < 100: continue
                
                # Check for "Full Lap" via Ratio
                ratio = current_end_dist / track_length_ref
                should_scale = False
                
                if 0.8 < ratio < 1.2:
                    should_scale = True
                
                if should_scale:
                    scale_factor = track_length_ref / current_end_dist
                    lap_dist_channel[idx_start:idx_end] *= scale_factor
            
            # If we loaded from DB, we might still want to scale it?
            # Usually native Lap Dist is "Correct" for that game. 
            # But converting to "Standard" track length is useful for comparison across sessions.
            # For now, if Native, assume it's good. 
            
            fused_data['Lap Dist'] = lap_dist_channel
            

            # 5. Gear
            logger.info("Processing Gear...")
            try:
                gear_df = con.execute("SELECT ts, value FROM \"Gear\" ORDER BY ts").df()
                if not gear_df.empty:
                    gear_ts = gear_df['ts'].values
                    gear_vals = gear_df['value'].values
                    
                    # Inference
                    initial_gear = 0.0
                    if len(gear_vals) >= 2:
                        val0, val1 = gear_vals[0], gear_vals[1]
                        if val0 == 0 and val1 > 0:
                            initial_gear = float(val1 - 1)
                        else:
                            initial_gear = float(val0)
                    elif len(gear_vals) == 1:
                        initial_gear = float(gear_vals[0])
                        
                    effective_ts = np.concatenate(([-1.0], gear_ts))
                    effective_vals = np.concatenate(([initial_gear], gear_vals))
                    indices = np.searchsorted(effective_ts, master_time, side='right') - 1
                    fused_data['Gear'] = effective_vals[indices]
            except Exception as e:
                logger.error(f"Gear processing error: {e}")

            # 6. Metadata / Steering Calibration
            meta_rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('CarName', 'CarClass')").fetchall()
            meta_dict = {k: v for k, v in meta_rows}
            car_name = meta_dict.get('CarName', 'Unknown')
            car_class = meta_dict.get('CarClass', 'Unknown')
            # Try to extract steering lock from metadata
            meta_steer_lock = None
            try:
                if 'CarSetup' in meta_dict:
                    import json
                    car_setup = json.loads(meta_dict['CarSetup'])
                    if 'VM_STEER_LOCK' in car_setup:
                        s_val = car_setup['VM_STEER_LOCK'].get('stringValue', '')
                        meta_steer_lock = parse_steer_lock(s_val)
            except: pass

            real_name, steering_lock = get_car_info(car_name, car_class, override_steer_lock=meta_steer_lock)
            
            # 7. Other Tables
            skip_tables = [
                'GPS Time', 'metadata', 'channelsList', 'eventsList', 'Session Info',
                'Lap', 'Lap Time', 'GPS Speed', 'Gear',
                'AntiStall Activated', 'Best LapTime', 'Best Sector1', 'Best Sector2', 
                'CloudDarkness', 'Engine Max RPM', 'Headlights State',
                'Brakes Air Temp', 'Clutch RPM', 'FFB Output', 'Steering Pos Unfiltered', 
                'Steering Shaft Torque', 'SurfaceTypes', 'Throttle Pos Unfiltered', 
                'Time Behind Next', 'Wind Heading', 'Wind Speed',
                'Brake Pos Unfiltered', 'Clutch Pos Unfiltered', 'Front3rdDeflection',
                'RearFlapActivated', 'Rear3rdDeflection', 'Regen Rate', 
                'RearFlapLegalStatus'
            ]
            
            tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
            for table in tables:
                if table in skip_tables: continue
                
                cols = [c[0] for c in con.execute(f"DESCRIBE \"{table}\"").fetchall()]
                has_ts = 'ts' in cols
                
                df = con.execute(f"SELECT * FROM \"{table}\"").df()
                if df.empty: continue
                
                # Check for multi-value columns (value1..4) for wheels
                wheel_cols = ['value1', 'value2', 'value3', 'value4']
                has_wheel_cols = all(c in df.columns for c in wheel_cols)
                
                if has_wheel_cols:
                    value_cols = ['_combined_wheels'] # Special flag
                else:
                    value_cols = [c for c in df.columns if c not in ['ts'] + wheel_cols]
                
                if not value_cols: continue
                
                if has_ts:
                    # Events
                    df['ts_rounded'] = df['ts'].round(3)
                    # --- Carry-over for Sparse Channels (e.g. TyresCompound) ---
                    # We look back for the last state before the requested window
                    if table in ['TyresCompound', 'WheelsDetached'] and trim_start_time is not None:
                        try:
                            # Use exact start_time for DB lookup
                            last_state_df = con.execute(f'SELECT * FROM "{table}" WHERE ts <= ? ORDER BY ts DESC LIMIT 1', [trim_start_time]).df()
                            if not last_state_df.empty:
                                logger.info(f"[{table}] Found carry-over state at ts={last_state_df.iloc[-1]['ts']}")
                                # Force it to be AT the first master_time index
                                start_t_rounded = round(trim_start_time, 3)
                                last_row = last_state_df.iloc[-1].copy()
                                last_row['ts'] = start_t_rounded
                                last_row['ts_rounded'] = start_t_rounded
                                # Prepend to the valid dataframe slice
                                valid_stint = df[(df['ts_rounded'] >= start_time) & (df['ts_rounded'] <= end_time)]
                                valid = pd.concat([pd.DataFrame([last_row]), valid_stint], ignore_index=True)
                                logger.info(f"[{table}] Prepended carry-over. Valid size: {len(valid)}")
                            else:
                                logger.warning(f"[{table}] No carry-over state found before ts={trim_start_time}")
                                valid = df[(df['ts_rounded'] >= start_time) & (df['ts_rounded'] <= end_time)]
                        except Exception as ce:
                            logger.error(f"Failed to fetch carry-over state for {table}: {ce}")
                            valid = df[(df['ts_rounded'] >= start_time) & (df['ts_rounded'] <= end_time)]
                    else:
                        valid = df[(df['ts_rounded'] >= start_time) & (df['ts_rounded'] <= end_time)]

                    if valid.empty: continue
                    
                    event_times = valid['ts_rounded'].values
                    idxs = np.searchsorted(master_time, event_times)
                    valid_mask = (idxs < len(master_time)) & (np.abs(master_time[np.clip(idxs, 0, len(master_time)-1)] - event_times) < 1e-4) # Relaxed to 1e-4
                    final_idxs = idxs[valid_mask]
                    
                    if table == 'TyresCompound':
                        logger.info(f"[{table}] master_time[0]={master_time[0]}, event_times={event_times[:3]}")
                        logger.info(f"[{table}] idxs={idxs[:3]}, mask={valid_mask[:3]}")
                    
                    for col in value_cols:
                        target_name = table if col == 'value' else col
                        if col == '_combined_wheels':
                            target_name = table
                            # Create N x 4 array
                            vals = valid[wheel_cols].values # (M, 4)
                            full = np.full((len(master_time), 4), np.nan)
                            full[final_idxs] = vals[valid_mask]
                            
                            # --- Forward Filling for Sparse Channels ---
                            if table in ['TyresCompound', 'WheelsDetached']:
                                # Convert to DataFrame for easy ffill (axis=0)
                                df_ffill = pd.DataFrame(full).ffill()
                                # Special case: default WheelsDetached to 0.0
                                if table == 'WheelsDetached':
                                    df_ffill = df_ffill.fillna(0.0)
                                full = df_ffill.values
                            
                            fused_data[target_name] = full.tolist()
                        else:
                            if target_name in fused_data: target_name = f"{table}_{col}"
                            full = np.full(len(master_time), np.nan)
                            full[final_idxs] = valid[col].values[valid_mask]
                            
                            # --- Forward Filling for Sparse Channels ---
                            if table in ['TyresCompound', 'WheelsDetached']:
                                series_ffill = pd.Series(full).ffill()
                                if table == 'WheelsDetached':
                                    series_ffill = series_ffill.fillna(0.0)
                                full = series_ffill.values
                                
                            fused_data[target_name] = full.tolist() if isinstance(full, np.ndarray) and full.ndim > 1 else full
                else:
                    # Continuous
                    current_indices = np.linspace(0, len(gps_times)-1, len(df))
                    source_time = np.interp(current_indices, np.arange(len(gps_times)), gps_times)
                    
                    for col in value_cols:
                        if col == '_combined_wheels':
                            target_name = table
                            vals = df[wheel_cols].values # (M, 4)
                            # Interpolate each wheel separately
                            full = np.zeros((len(master_time), 4))
                            for w in range(4):
                                full[:, w] = np.interp(master_time, source_time, vals[:, w])
                            fused_data[target_name] = full.tolist()
                        else:
                            target_name = table if col == 'value' else col
                            if target_name in fused_data: target_name = f"{table}_{col}"
                            
                            vals = df[col].values
                            if np.issubdtype(vals.dtype, np.number):
                                interp_vals = np.interp(master_time, source_time, vals)
                                fused_data[target_name] = interp_vals

            # 8. Post-Process Steering Angle
            if 'Steering Pos' in fused_data:
                steer_pos = fused_data['Steering Pos']
                max_val = np.nanmax(np.abs(steer_pos))
                if max_val <= 2.0:
                     fused_data['Steering Angle'] = steer_pos * (steering_lock / 2)
                else:
                     fused_data['Steering Angle'] = steer_pos
            
            # 9. Elevation Fusion (Data Union)
            try:
                from .elevation_service import compute_z_for_fused_data
                # We need a temp DF to pass to the helper
                # Using .values ensures we have raw numpy arrays for the service
                df_temp = pd.DataFrame({
                    'GPS Latitude': np.array(fused_data.get('GPS Latitude', np.zeros(len(master_time)))),
                    'GPS Longitude': np.array(fused_data.get('GPS Longitude', np.zeros(len(master_time)))),
                    'Lap Dist': np.array(fused_data.get('Lap Dist', np.zeros(len(master_time))))
                })
                fused_data['WorldPosZ'] = compute_z_for_fused_data(df_temp, track_name, track_layout)
                logger.info("3D Elevation (WorldPosZ) successfully fused.")
            except Exception as ez:
                logger.error(f"Elevation Fusion Failed: {ez}")
                # FALLBACK: Ensure the key ALWAYS exists to avoid N/A in frontend
                if 'WorldPosZ' not in fused_data:
                    fused_data['WorldPosZ'] = np.zeros(len(master_time))

            # Finalize
            df_final = pd.DataFrame(fused_data)
            
            if output_parquet:
                logger.info(f"Saving to {output_parquet}")
                df_final.to_parquet(output_parquet)
                
            return df_final

        except Exception as e:
            logger.error(f"Telemetry Fusion Error: {e}")
            raise e
        finally:
            con.close()

    @staticmethod
    def find_compatible_laps(data_dir: str, track_name: str, track_layout: str, car_class: str):
        """Find all laps across all sessions matching track, layout and class."""
        import glob
        import duckdb
        
        files = glob.glob(os.path.join(data_dir, "*.duckdb"))
        compatible_laps = []
        
        for f in files:
            session_id = os.path.basename(f)
            try:
                with duckdb.connect(f, read_only=True) as con:
                    # Quick metadata check
                    meta_rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('TrackName', 'TrackLayout', 'CarClass', 'CarName', 'DriverName', 'SessionTime')").fetchall()
                    meta = {k: v.strip() if isinstance(v, str) else v for k, v in meta_rows}
                    
                    track_name_match = (meta.get('TrackName') == track_name.strip())
                    
                    # Lenient layout matching
                    provided_layout = track_layout.strip()
                    db_layout = meta.get('TrackLayout', '').strip()
                    layout_match = (db_layout == provided_layout) or (not provided_layout and (not db_layout or db_layout == meta.get('TrackName')))
                    
                    car_class_match = (meta.get('CarClass') == car_class.strip())

                    if track_name_match and layout_match and car_class_match:
                        logger.info(f"find_compatible_laps: Found match: {f}")
                        # Full header fetch to get stint/lap details
                        laps_data = TelemetryService.get_laps_header(f)
                        raw_laps = laps_data.get('laps', [])
                        
                        car_model, _ = get_car_info(meta.get('CarName', 'Unknown'), meta.get('CarClass', 'Unknown'))
                        total_laps = len(raw_laps)
                        stint_count = max([l.get('stint', 1) for l in raw_laps]) if raw_laps else 0

                        for lap in raw_laps:
                            compatible_laps.append({
                                "sessionId": session_id,
                                "sessionName": session_id.replace(".duckdb", ""),
                                "date": os.path.getmtime(f),
                                "lap": lap['lap'],
                                "stint": lap.get('stint', 0),
                                "startTime": lap['startTime'],
                                "duration": lap['duration'],
                                "isValid": lap['isValid'],
                                "s1": lap.get('s1'),
                                "s2": lap.get('s2'),
                                "s3": lap.get('s3'),
                                "driver": meta.get('DriverName', 'Unknown'),
                                "sessionTime": meta.get('SessionTime', 'Unknown'),
                                "carModel": car_model,
                                "totalLaps": total_laps,
                                "stintCount": stint_count,
                                "fuelUsed": lap.get('fuelUsed', 0.0)
                            })
                    else:
                        pass
            except Exception as e:
                logger.warning(f"Failed to scan {f} for compatible laps: {e}")
        
        return sorted(compatible_laps, key=lambda x: (x['date'], x['lap']), reverse=True)
