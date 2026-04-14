import numpy as np
import pandas as pd
import logging
import os
from .telemetry_service import TelemetryService
from ..utils.track_metadata import get_track_range
from ..utils.track_db import TRACK_REGISTRY, find_track_in_registry

logger = logging.getLogger(__name__)

def compute_z(raw_data, track_name, track_layout=None):
    """
    Computes smoothed, loop-corrected elevation (Z) based on track distance (d)
    and geometry registry. Use np.min to zero-base the height.
    """
    if not raw_data or len(raw_data.get('lat', [])) == 0:
        return np.array([])
        
    z = None
    if track_name:
        matched_key, matched_track = find_track_in_registry(track_name)
        if matched_track:
            layout_key = track_layout if (track_layout and track_layout in matched_track["layouts"]) else "Default"
            ref_points = matched_track["layouts"].get(layout_key, {}).get("ref_points", [])
            
            if ref_points:
                # Use unique distance to prevent interpolation artifacts
                cd, u_idx = np.unique(raw_data['d'], return_index=True)
                
                tel_d = cd - cd[0]
                ref_max_d = ref_points[-1]['dist']
                xp = [p['dist'] for p in ref_points]
                fp = [p['alt'] for p in ref_points]
                
                if np.nanmax(tel_d) > 1.0:
                    dist_norm = (tel_d / np.nanmax(tel_d)) * ref_max_d
                    z_raw = np.interp(np.clip(dist_norm, 0, ref_max_d), xp, fp)
                    
                    # Loop closure alignment
                    error = fp[-1] - z_raw[-1]
                    z_corrected = z_raw + np.linspace(fp[0] - z_raw[0], error, len(z_raw))
                    
                    # Smooth but KEEP original array size by mapping back to raw_data['d']
                    z_full = np.interp(raw_data['d'], cd, z_corrected)
                    
                    window = min(40, len(z_full))
                    if window > 1:
                        # EDGE PADDING: Prevent z from dropping to half-value at start/end
                        pad_size = window // 2
                        z_padded = np.pad(z_full, (pad_size, pad_size), mode='edge')
                        z_smooth = np.convolve(z_padded, np.ones(window)/window, mode='valid')
                        z = z_smooth[:len(z_full)]
                    else:
                        z = z_full

    if z is None:
        return np.zeros(len(raw_data['lat']))

    # SPIKE FILTER
    z_safe = z.copy()
    n = len(z_safe)
    if n > 2:
        if z_safe[0] < z_safe[1] - 5.0: z_safe[0] = z_safe[1]
        for i in range(1, n-1):
            avg_neigh = (z_safe[i-1] + z_safe[i+1]) / 2
            if z_safe[i] < avg_neigh - 5.0: z_safe[i] = avg_neigh
        if z_safe[n-1] < z_safe[n-2] - 5.0: z_safe[n-1] = z_safe[n-2]

    return z_safe

def compute_z_for_fused_data(df, track_name, track_layout=None):
    """
    Stand-alone version of compute_z that operates on a fused telemetry DataFrame.
    Used for 'Data Union' strategy to inject Z-axis into the main telemetry stream.
    """
    if df is None or df.empty or 'GPS Latitude' not in df.columns:
        return np.zeros(len(df)) if df is not None else np.array([])
        
    raw_data = {
        'lat': df['GPS Latitude'].values,
        'lon': df['GPS Longitude'].values,
        'd': df['Lap Dist'].values if 'Lap Dist' in df.columns else np.zeros(len(df))
    }
    return compute_z(raw_data, track_name, track_layout)

def extract_lap_telemetry(db_path, t_start, t_end, padding=0.0, session_id=None, stint_id=None, stint_range=None, is_first=False, is_last=False):
    """
    Leverages the 2D fusion engine to extract identical data for 3D use.
    Ensures 100% synchronization between 2D charts and 3D maps.
    'is_first'/'is_last' triggers Stint-Anchor logic to snap to stint boundaries.
    """
    try:
        # PADDING / ANCHORING: 
        # Directly use the provided padding to avoid hardcoded overlap (1.5s was causing overlap)
        t_start_final = t_start - padding
        t_end_final = t_end + padding
        
        if is_first and stint_range:
            t_start_final = stint_range[0]
            logger.info(f"3D: Snapping to Stint Start: {t_start_final}")
            
        if is_last and stint_range:
            t_end_final = stint_range[1]
            logger.info(f"3D: Snapping to Stint End: {t_end_final}")

        # Use existing 2D fusion engine
        df = TelemetryService.fuse_session_data(
            db_path, 
            target_freq=100, 
            trim_start_time=t_start_final, 
            trim_end_time=t_end_final
        )
        
        # LOGIC ALIGNMENT: Fallback for intermittent gaps
        if (df is None or df.empty) and stint_id is not None:
            logger.info(f"3D: Lap-based extraction failed, falling back to STINT-LEVEL search...")
            # If the precise lap slice failed, broaden the search drastically to capture ANY movement in the stint
            df = TelemetryService.fuse_session_data(
                db_path,
                target_freq=20, # Low freq for high stability
                trim_start_time=t_start_final - 10.0,
                trim_end_time=t_end_final + 10.0
            )
        
        if df is None or df.empty:
            return None

        orig_count = len(df)
        
        # DATA CLEANUP: Drop NaNs (GPS is essential, Lap Dist is optional for path)
        df = df.dropna(subset=['GPS Latitude', 'GPS Longitude'])
        
        # Ensure Lap Dist has values to avoid interpolation issues (even if just 0s)
        if 'Lap Dist' in df.columns:
            df['Lap Dist'] = df['Lap Dist'].fillna(0)
        else:
            df['Lap Dist'] = 0
            
        df = df[(df['GPS Latitude'] != 0) & (df['GPS Longitude'] != 0)]
        gps_count = len(df)
        
        # We don't filter out Lap Dist < 0 here anymore to keep Out-Laps intact
        # (LMU sometimes has minor negative distances in pits)
        
        final_count = len(df)
        logger.info(f"3D extraction stats: orig={orig_count}, valid_gps={gps_count}, final={final_count} (Times: {t_start}-{t_end})")

        # Standardize labels and ENSURE NO NaNs (Critical for JSON serialization)
        def safe_array(arr, default_val=0):
            if arr is None: return np.zeros(len(df))
            a = np.nan_to_num(arr, nan=default_val)
            return a

        res = {
            "v": safe_array(df['Ground Speed'].values / 3.6 if 'Ground Speed' in df.columns else (df['GPS Speed'].values / 3.6 if 'GPS Speed' in df.columns else None)),
            "d": safe_array(df['Lap Dist'].values),
            "lat": safe_array(df['GPS Latitude'].values),
            "lon": safe_array(df['GPS Longitude'].values),
            "throttle": safe_array(df['Throttle Pos'].values if 'Throttle Pos' in df.columns else None),
            "brake": safe_array(df['Brake Pos'].values if 'Brake Pos' in df.columns else None),
            "lateral": safe_array(df['Path Lateral'].values if 'Path Lateral' in df.columns else None),
            "width": safe_array(df['Track Edge'].values if 'Track Edge' in df.columns else (np.ones(len(df)) * 7.5)),
            "in_pits": safe_array(df['In Pits'].values if 'In Pits' in df.columns else None),
            "z": safe_array(df['WorldPosZ'].values if 'WorldPosZ' in df.columns else None)
        }
        
        return res
    except Exception as e:
        logger.error(f"Error extracting lap telemetry via fusion: {e}")
        return None

def get_3d_track_data(db_path, lap_times, base_times, track_name=None, track_layout=None, session_id=None, stint=None, stint_range=None, is_first=False, is_last=False):
    """
    Returns dual-layer 3D data: baseMap (fastest lap) and racingLine (selected lap).
    Includes stint context to handle junction-lap data loss by aligning with 2D stint-based logic.
    """
    # 1. Fetch data through fusion engine (No padding for 3D mesh to avoid overlaps)
    base_raw = extract_lap_telemetry(db_path, base_times[0], base_times[1], padding=0.0, session_id=session_id, stint_id=stint)
    
    # FALLBACK: If base_raw is empty, try without stint_id to be more inclusive
    if not base_raw and stint is not None:
        logger.info(f"3D: Base map empty with stint={stint}, retrying without stint filter...")
        base_raw = extract_lap_telemetry(db_path, base_times[0], base_times[1], padding=0.0, session_id=session_id, stint_id=None)
    
    # RACING LINE: Also zero padding to match mesh closure logic
    target_raw = extract_lap_telemetry(
        db_path, 
        lap_times[0], 
        lap_times[1], 
        padding=0.0, 
        session_id=session_id, 
        stint_id=stint,
        stint_range=stint_range,
        is_first=is_first,
        is_last=is_last
    )

    if not base_raw or not target_raw:
        logger.warning(f"3D: Extraction failed for session={session_id}. BaseRaw={bool(base_raw)}, TargetRaw={bool(target_raw)}")
        # Provide at least ONE center point if possible from metadata
        return {"baseMap": [], "racingLine": [], "center": {"lat":0, "lon":0, "lonScale":1}}

    # 2. Elevation (Z) Generation
    # Calculate zBase (absolute sea level of the lowest point in the base map)
    # This allows the frontend Car to sync its absolute WorldPosZ to the relative mesh
    z_base_abs = 0.0
    if 'z' in base_raw and len(base_raw['z']) > 0:
        z_base_abs = float(np.nanmin(base_raw['z']))
    
    base_z = compute_z(base_raw, track_name, track_layout)
    
    # 3. Projection & Center (Matching 2D center logic)
    c_lat = np.mean(base_raw['lat'])
    c_lon = np.mean(base_raw['lon'])
    lon_scale = np.cos(np.radians(c_lat))
    deg_to_m = 111320

    def project(raw):
        x = (raw['lon'] - c_lon) * lon_scale * deg_to_m
        y = (raw['lat'] - c_lat) * deg_to_m
        return x, y

    bx, by = project(base_raw)
    tx, ty = project(target_raw)

    # 4. Snap Racing Line to Nearest Point on Base Track (Z-only)
    target_z_snapped = []
    base_coords = np.stack([bx, by], axis=1)
    for i in range(len(tx)):
        # Optimization: nearest neighbor on geometry
        # For ~4000 points, simple argmin(dist) is ok.
        sq_d = (base_coords[:,0] - tx[i])**2 + (base_coords[:,1] - ty[i])**2
        target_z_snapped.append(float(base_z[np.argmin(sq_d)]))
    
    target_z_snapped = np.array(target_z_snapped)

    # 5. Final Point Formatting
    def format_points(x, y, z, raw_data, target_len=4000):
        if len(x) == 0: return []
        step = max(1, len(x) // target_len)
        res = []
        
        # Helper to ensure JSON compliance
        def jval(v, default=0.0):
            try:
                if v is None or np.isnan(v) or np.isinf(v):
                    return float(default)
                return float(v)
            except:
                return float(default)

        def get_val(col_name, idx):
            if col_name in raw_data:
                col = raw_data[col_name]
                try:
                    if hasattr(col, 'iloc'):
                        return float(col.iloc[idx])
                    if hasattr(col, 'values'):
                        return float(col.values[idx])
                    return float(col[idx])
                except (IndexError, KeyError, TypeError, ValueError):
                    return 0.0
            return 0.0

        for i in range(0, len(x), step):
            res.append({
                "x": jval(x[i]), "y": jval(y[i]), "z": jval(z[i] - z_base_abs),
                "d": jval(get_val('d', i)), 
                "speed": jval(get_val('v', i) * 3.6),
                "throttle": jval(get_val('throttle', i)), 
                "brake": jval(get_val('brake', i)),
                "lat": jval(get_val('lateral', i)), 
                "width": jval(get_val('width', i)),
                "in_pits": int(float(get_val('in_pits', i))),
                "raw_lat": jval(get_val('lat', i)), 
                "raw_lon": jval(get_val('lon', i))
            })
        return res
    
    # 6. Final JSON Sanitization for the whole response
    def sanitize_float(obj):
        if isinstance(obj, float):
            if np.isnan(obj) or np.isinf(obj): return 0.0
            return obj
        if isinstance(obj, dict):
            return {k: sanitize_float(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [sanitize_float(i) for i in obj]
        return obj

    final_base = format_points(bx, by, base_z, base_raw)
    final_racing = format_points(tx, ty, target_z_snapped, target_raw)

    # DIAGNOSTIC LOGGING
    logger.info("!!! EXECUTING 3D TRACK GENERATION WITH REFACTORED COMPUTE_Z !!!")
    if final_base:
        logger.info(f"3D Map Data - Base Start Z: {final_base[0]['z']:.3f}, Min Z in array: {np.min(base_z):.3f}")
    if final_racing:
        logger.info(f"3D Map Data - Racing Start Z: {final_racing[0]['z']:.3f}")

    return sanitize_float({
        "baseMap": final_base,
        "racingLine": final_racing,
        "center": {"lat": float(c_lat), "lon": float(c_lon), "lonScale": float(lon_scale)},
        "zBase": z_base_abs,
        "selectedLapInfo": {"lap": stint_range[0] if stint_range else lap_times[1]}
    })
