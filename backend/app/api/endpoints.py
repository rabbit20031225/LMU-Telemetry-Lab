from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Request
from typing import List, Optional
from pydantic import BaseModel
import os
import glob
import logging
import shutil
from datetime import datetime
from ..services.telemetry_service import TelemetryService
from ..services.profiles_service import ProfilesService
from ..services.elevation_service import get_3d_track_data
import duckdb
import numpy as np
from ..utils.track_db import find_track_in_registry

router = APIRouter()

import sys

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "antigravity-backend", "version": "1.1.0"}

@router.get("/sessions/{session_id}/3d-track")
async def get_3d_track(
    session_id: str, 
    lap: int = Query(..., ge=0),
    stint: Optional[int] = Query(None),
    profile_id: Optional[str] = Query("guest")
):
    """Get 3D track path (X, Y, Z) for visualization."""
    data_dir, _ = get_contextual_dirs(profile_id)
    db_path = os.path.join(data_dir, session_id)
    
    logger.info(f"API: GET /track3d - Session: {session_id}, Lap: {lap}, Profile: {profile_id}")
    
    if not os.path.exists(db_path):
        logger.error(f"3D Track DB NOT FOUND: {db_path}")
        raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
        
    try:
        # Extract track metadata for scaling and layout-specific mapping
        track_name = None
        track_layout = None
        with duckdb.connect(db_path, read_only=True) as con:
            meta = con.execute("SELECT key, value FROM metadata WHERE key IN ('TrackName', 'TrackLayout')").fetchall()
            meta_dict = {k: v for k, v in meta}
            track_name = meta_dict.get('TrackName')
            track_layout = meta_dict.get('TrackLayout')
            
            # 1. Resolve Times for the Selected Lap (Racing Line)
            laps_header = TelemetryService.get_laps_header(db_path)
            laps_list = laps_header.get("laps", [])

            selected_lap = next((
                l for l in laps_list 
                if l.get('lap') == lap and (stint is None or l.get('stint') == stint)
            ), None)
            
            if not selected_lap and 0 <= lap < len(laps_list):
                selected_lap = laps_list[lap]
                
            if not selected_lap: 
                logger.error(f"3D Track: Lap {lap} (Stint: {stint}) NOT FOUND in session {session_id}")
                raise HTTPException(status_code=404, detail="Lap not found")
                
            lap_times = [selected_lap['startTime'], selected_lap['endTime']]

            # Resolve stint boundaries for "Stint-Anchor" logic
            cur_stint_id = selected_lap.get('stint')
            stint_laps = [l for l in laps_list if l.get('stint') == cur_stint_id]
            stint_start = min(l['startTime'] for l in stint_laps) if stint_laps else lap_times[0]
            stint_end = max(l['endTime'] for l in stint_laps) if stint_laps else lap_times[1]
            
            # RELAXED DETECTION: 5.0s tolerance to handle large metadata/telemetry offsets at stint junctions
            is_first = (lap_times[0] <= stint_start + 5.0)
            is_last = (lap_times[1] >= stint_end - 5.0)

            # 2. Resolve Times for the Base Map (Fastest Lap)
            valid_laps = [l for l in stint_laps if l.get('isValid') and not l.get('isOutLap')]
            best_lap = min(valid_laps, key=lambda x: x['duration']) if valid_laps else (max(stint_laps, key=lambda x: x['duration']) if stint_laps else selected_lap)
            
            # FALLBACK LOGIC: If best_lap is strangely empty or too short, use selected_lap
            if not best_lap or (best_lap.get('duration', 0) < 5.0):
                best_lap = selected_lap

            base_times = [best_lap['startTime'], best_lap['endTime']]
            logger.info(f"3D: Using Lap {selected_lap['lap']} for RacingLine, Lap {best_lap['lap']} for BaseMap")

            # 3. Use Refactored Elevation Service (Time-Driven + 2D Fusion Engine)
            # Pass stint boundaries and junction flags for robust "Stint-Anchor" extraction
            data_dict = get_3d_track_data(
                db_path=db_path, 
                lap_times=lap_times, 
                base_times=base_times, 
                track_name=track_name, 
                track_layout=track_layout,
                session_id=session_id,
                stint=stint,
                stint_range=[stint_start, stint_end],
                is_first=is_first,
                is_last=is_last
            )

            return {
                "baseMap": data_dict["baseMap"], "racingLine": data_dict["racingLine"],
                "trackName": track_name, "trackLayout": track_layout,
                "fastestLap": best_lap['lap'], "selectedLapInfo": selected_lap,
                "center": data_dict.get("center"),
                "zBase": data_dict.get("zBase", 0)
            }
            
    except Exception as e:
        logger.error(f"Error generating 3D track for {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def get_base_path():
    """Get the base path for resources, handles PyInstaller environment."""
    if getattr(sys, 'frozen', False):
        # If running as a bundled executable (PyInstaller)
        # sys._MEIPASS is the internal resource folder
        if hasattr(sys, '_MEIPASS'):
            return sys._MEIPASS
        return os.path.dirname(sys.executable)
    # If running in a normal Python environment (Development)
    # This assumes endpoints.py is at backend/app/api/endpoints.py
    # To reach root: api -> app -> backend -> root (4 levels)
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

BASE_DIR = get_base_path()

# --- Profile Aware Path Resolution ---
# We initialize the persistent app data dir and migrate legacy project-root data if needed
APP_DATA_ROOT = ProfilesService.get_app_data_dir()
LEGACY_DATA_DIR = os.path.join(BASE_DIR, "DuckDB_data")

# Initial migration
ProfilesService.ensure_guest_profile()
ProfilesService.migrate_legacy_data(LEGACY_DATA_DIR)

def get_contextual_dirs(profile_id: Optional[str] = "guest"):
    """Get dynamic data and cache dirs based on profile."""
    p_id = profile_id or "guest"
    return (
        ProfilesService.get_profile_data_dir(p_id),
        ProfilesService.get_profile_cache_dir(p_id)
    )

logger = logging.getLogger(__name__)

# --- Profile Endpoints ---

class ProfileCreate(BaseModel):
    name: str

class ProfileUpdate(BaseModel):
    name: str

@router.get("/profiles")
async def list_profiles():
    profiles = ProfilesService.list_profiles()
    if not profiles:
        ProfilesService.ensure_guest_profile()
        profiles = ProfilesService.list_profiles()
    return {"profiles": profiles}

@router.post("/profiles")
async def create_profile(req: ProfileCreate):
    return ProfilesService.create_profile(req.name)

@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str):
    ProfilesService.delete_profile(profile_id)
    return {"status": "success"}

@router.put("/profiles/{profile_id}")
async def update_profile(profile_id: str, req: ProfileUpdate):
    success = ProfilesService.update_profile(profile_id, req.name)
    if not success:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"status": "success"}

class OpenPathRequest(BaseModel):
    path: str
    x: Optional[int] = None
    y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None

@router.get("/system/validate-path")
async def validate_system_path(path: str = Query(...)):
    """Check if a local path exists."""
    return {"exists": os.path.exists(os.path.normpath(path))}

@router.post("/system/open-path")
async def open_system_path(req: OpenPathRequest):
    """Open a local path in the system file explorer."""
    path = req.path
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")
    
    try:
        if sys.platform == 'win32':
            import subprocess
            # Normalize path for Windows
            norm_path = os.path.normpath(path)
            if os.path.exists(norm_path):
                # Using explorer.exe directly often helps bring the window to front
                subprocess.Popen(['explorer', norm_path])
                return {"status": "success", "message": f"Opening {norm_path}"}
            else:
                # If path doesn't exist, try opening the parent
                parent = os.path.dirname(norm_path)
                if os.path.exists(parent):
                    subprocess.Popen(['explorer', parent])
                    return {"status": "partial", "message": f"Path not found, opening parent: {parent}"}
                raise HTTPException(status_code=404, detail="Path not found")
        else:
            # Fallback for Linux/macOS
            import subprocess
            opener = "open" if sys.platform == "darwin" else "xdg-open"
            subprocess.run([opener, path])
            return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to open path {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system/pick-and-upload")
async def pick_and_upload(req: OpenPathRequest, profile_id: Optional[str] = Query("guest")):
    """Open a native file picker at the specified path and 'upload' the selected file."""
    import tkinter as tk
    from tkinter import filedialog
    import shutil
    
    path = req.path
    data_dir, _ = get_contextual_dirs(profile_id)
    
    try:
        # Enable High DPI awareness for Windows to make the dialog look sharp
        try:
            from ctypes import windll
            windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            try:
                windll.user32.SetProcessDPIAware()
            except Exception:
                pass

        # Initialize tkinter and hide the main window
        root = tk.Tk()
        root.withdraw()
        
        # Position the hidden root window in the center of the app window
        # so the dialog opens centered relative to the app
        if req.x is not None and req.y is not None and req.width is not None and req.height is not None:
            # Calculate center
            center_x = req.x + (req.width // 2)
            center_y = req.y + (req.height // 2)
            # Setting geometry for the hidden window affects where its children (dialogs) appear
            root.geometry(f"+{center_x}+{center_y}")

        root.attributes('-topmost', True) # Ensure dialog is on top
        
        initial_dir = path if os.path.exists(path) else None
        
        # Open the native file picker
        file_path = filedialog.askopenfilename(
            initialdir=initial_dir,
            title="Select LMU Telemetry File (.duckdb)",
            filetypes=[("DuckDB files", "*.duckdb"), ("All files", "*.*")]
        )
        
        root.destroy() # Cleanup tkinter
        
        if not file_path:
            return {"status": "cancelled"}
            
        # Copy the file to the data directory
        filename = os.path.basename(file_path)
        dest_path = os.path.join(data_dir, filename)
        
        shutil.copy2(file_path, dest_path)
        
        return {
            "status": "success", 
            "id": filename, 
            "message": f"Successfully imported {filename}"
        }
        
    except Exception as e:
        logger.error(f"Native file picker failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profiles/{profile_id}/avatar")
async def upload_profile_avatar(profile_id: str, file: UploadFile = File(...)):
    # Create profile-specific avatar dir
    avatar_dir = os.path.join(ProfilesService.get_app_data_dir(), "Data", profile_id, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"avatar_{int(datetime.now().timestamp())}{file_ext}"
    file_path = os.path.join(avatar_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update profile metadata
    # The URL should match our static mount: /api/v1/profile-data/Data/{profile_id}/avatars/{filename}
    avatar_url = f"/api/v1/profile-data/Data/{profile_id}/avatars/{filename}"
    ProfilesService.update_profile_avatar(profile_id, avatar_url)
    
    return {"avatar_url": avatar_url}

@router.get("/steering-wheels")
async def list_steering_wheels():
    """List categorized steering wheel images from the public directory."""
    # In development, look in public/steering wheel
    # In production, look in frontend/dist/steering wheel (where Vite copies public content)
    if getattr(sys, 'frozen', False):
        wheels_dir = os.path.join(BASE_DIR, "frontend", "dist", "steering wheel")
    else:
        wheels_dir = os.path.join(BASE_DIR, "frontend", "public", "steering wheel")
    
    if not os.path.exists(wheels_dir):
        logger.warning(f"Steering wheels directory NOT FOUND at: {wheels_dir}")
        return {"categories": {}}
        
    categories = {}
    
    for root, dirs, files in os.walk(wheels_dir):
        # Calculate relative path from wheels_dir
        rel_path = os.path.relpath(root, wheels_dir)
        
        category_name = "Root" if rel_path == "." else rel_path
        
        wheels = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
        if wheels:
            # We want to return the path relative to the public/ steering wheel folder
            clean_path = "" if rel_path == "." else rel_path.replace("\\", "/")
            categories[category_name] = [
                {"name": os.path.splitext(w)[0], "path": f"{clean_path}/{w}" if clean_path else w}
                for w in wheels
            ]
            
    return {"categories": categories}

@router.get("/ping")
async def ping():
    return {"status": "pong", "message": "API is reachable"}

@router.get("/sessions")
async def list_sessions(profile_id: Optional[str] = Query("guest")):
    """List available DuckDB sessions with metadata."""
    data_dir, _ = get_contextual_dirs(profile_id)
    logger.info(f"API: GET /sessions - Using Profile: {profile_id}, Dir: {data_dir}")
    
    if not os.path.exists(data_dir):
         return {"sessions": [], "error": "Data directory not found"}
         
    import duckdb
    from ..services.car_lookup import get_car_info
    
    files = glob.glob(os.path.join(data_dir, "*.duckdb"))
    files = sorted(files, key=os.path.getmtime, reverse=True)
    sessions = []
    
    for f in files:
        name = os.path.basename(f)
        session_info = {
            "id": name,
            "name": name.replace(".duckdb", ""),
            "date": os.path.getmtime(f),
            "size": os.path.getsize(f)
        }
        
        # Try to extract metadata
        try:
            with duckdb.connect(f, read_only=True) as con:
                meta_rows = con.execute("SELECT key, value FROM metadata").fetchall()
                meta_dict = {k: v for k, v in meta_rows}
                
                track_name = meta_dict.get('TrackName', '')
                track_layout = meta_dict.get('TrackLayout', '')
                raw_car = meta_dict.get('CarName', '')
                raw_class = meta_dict.get('CarClass', '')
                
                car_model, _ = get_car_info(raw_car, raw_class)
                
                if track_name: 
                    session_info["trackName"] = track_name
                    # Try to find aliases in registry
                    matched_key, track_data = find_track_in_registry(track_name)
                    if matched_key:
                        session_info["commonTrackName"] = matched_key
                        session_info["trackAliases"] = track_data.get("aliases", [])
                        session_info["country"] = track_data.get("country", "")
                
                if track_layout: session_info["trackLayout"] = track_layout
                if car_model: session_info["carModel"] = car_model
                if raw_class: session_info["carClass"] = raw_class
        except Exception as e:
            logger.warning(f"Failed to read metadata for {name}: {e}")
            
        sessions.append(session_info)
        
    logger.info(f"API: Returning {len(sessions)} sessions")
    return {"sessions": sessions}

@router.post("/sessions/upload")
async def upload_session(file: UploadFile = File(...), profile_id: Optional[str] = Query("guest")):
    """Upload a .duckdb session file."""
    data_dir, _ = get_contextual_dirs(profile_id)
    if not file.filename.endswith(".duckdb"):
        raise HTTPException(status_code=400, detail="Only .duckdb files are allowed")
    
    filename = os.path.basename(file.filename)
    file_path = os.path.join(data_dir, filename)
    
    # Check overwrite?
    # For now, allow overwrite or append index?
    # Simple overwrite.
    
    try:
        with open(file_path, "wb") as buffer:
            import shutil
            shutil.copyfileobj(file.file, buffer)
            
        return {"id": filename, "status": "uploaded", "size": os.path.getsize(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

class RenameRequest(BaseModel):
    new_name: str

@router.post("/sessions/{session_id}/rename") # Using POST or PUT
async def rename_session(session_id: str, request: RenameRequest, profile_id: Optional[str] = Query("guest")):
    """Rename a session file."""
    data_dir, cache_dir = get_contextual_dirs(profile_id)
    old_path = os.path.join(data_dir, session_id)
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    new_name = request.new_name
    if not new_name.endswith(".duckdb"):
        new_name += ".duckdb"
        
    # Prevent path traversal
    new_name = os.path.basename(new_name)
    new_path = os.path.join(data_dir, new_name)
    
    if os.path.exists(new_path):
        raise HTTPException(status_code=400, detail="File with new name already exists")
        
    try:
        os.rename(old_path, new_path)
        
        # Clear Cache if exists
        if os.path.exists(cache_dir):
            for cache_file in glob.glob(os.path.join(cache_dir, f"{session_id}*.parquet")):
                try:
                    os.remove(cache_file)
                except Exception as e:
                    print(f"Warning: Failed to delete cache file {cache_file}: {e}")
            
        return {"id": new_name, "old_id": session_id, "status": "renamed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, profile_id: Optional[str] = Query("guest")):
    """Delete a session file."""
    data_dir, cache_dir = get_contextual_dirs(profile_id)
    file_path = os.path.join(data_dir, session_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    try:
        os.remove(file_path)
        
        # Clear Cache
        if os.path.exists(cache_dir):
            for cache_file in glob.glob(os.path.join(cache_dir, f"{session_id}*.parquet")):
                try:
                    os.remove(cache_file)
                except Exception as e:
                    print(f"Warning: Failed to delete cache file {cache_file}: {e}")
            
        return {"id": session_id, "status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}/laps")
async def get_session_laps(session_id: str, profile_id: Optional[str] = Query("guest")):
    """Get summary of laps for a session with robust logging."""
    data_dir, _ = get_contextual_dirs(profile_id)
    logger.info(f"API: GET /laps - Profile: {profile_id}, Session: {session_id}")
    db_path = os.path.join(data_dir, session_id)
    if not os.path.exists(db_path):
        logger.error(f"Database NOT FOUND: {db_path}")
        raise HTTPException(status_code=404, detail=f"Database not found: {session_id}")
        
    try:
        data = TelemetryService.get_laps_header(db_path)
        logger.info(f"API: Successfully retrieved {len(data.get('laps', []))} laps for {session_id}")
        return data
    except Exception as e:
        logger.error(f"Error getting laps for {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reference-laps")
async def get_reference_laps(
    track_name: str = Query(...),
    track_layout: str = Query(""),
    car_class: str = Query(...),
    profile_id: Optional[str] = Query("guest")
):
    """Find compatible laps for reference across all profile sessions."""
    data_dir, _ = get_contextual_dirs(profile_id)
    try:
        laps = TelemetryService.find_compatible_laps(data_dir, track_name, track_layout, car_class)
        return {"laps": laps}
    except Exception as e:
        logger.error(f"Error finding compatible laps: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}/telemetry")
async def get_telemetry(
    session_id: str, 
    request: Request,
    freq: int = Query(60, ge=1, le=1000),
    stint_id: Optional[int] = Query(None),
    lap_id: Optional[int] = Query(None),
    profile_id: Optional[str] = Query("guest")
):
    """Get fused telemetry data with robust logging."""
    data_dir, cache_dir = get_contextual_dirs(profile_id)
    logger.info(f"API: GET /telemetry - Profile: {profile_id}, Session: {session_id}, Freq: {freq}, Stint: {stint_id}")
    db_path = os.path.join(data_dir, session_id)
    if not os.path.exists(db_path):
        logger.error(f"Database NOT FOUND: {db_path}")
        raise HTTPException(status_code=404, detail="Session not found")
        
    try:
        # Ensure cache dir exists
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)

        stint_suffix = f"_stint{stint_id}" if stint_id is not None else ""
        lap_suffix = f"_lap{lap_id}" if lap_id is not None else ""
        parquet_path = os.path.join(cache_dir, f"{session_id}_{freq}Hz{stint_suffix}{lap_suffix}_elev_v1.parquet")
        
        if os.path.exists(parquet_path):
             import pandas as pd
             df = pd.read_parquet(parquet_path)
        else:
             logger.info(f"Fusing data for {session_id} at {freq}Hz...")
             trim_start = None
             trim_end = None
             
             header_data = TelemetryService.get_laps_header(db_path)
             if stint_id is not None:
                 stint_laps = [lap for lap in header_data['laps'] if lap.get('stint') == stint_id]
                 if stint_laps:
                     trim_start = min(lap['startTime'] for lap in stint_laps)
                     trim_end = max(lap['endTime'] for lap in stint_laps)
                 else:
                     logger.warning(f"Stint {stint_id} not found in session")
                     raise HTTPException(status_code=404, detail=f"Stint {stint_id} not found")
             
             # Map lap_id if provided (could be used together with stint or alone)
             # If lap_id is provided, it OVERRIDES stint boundaries for that specific lap
             lap_id = request.query_params.get("lap_id")
             if lap_id is not None:
                 try:
                     lap_idx = int(lap_id)
                     target_lap = next((l for l in header_data['laps'] if l['lap'] == lap_idx), None)
                     if target_lap:
                         trim_start = target_lap['startTime']
                         trim_end = target_lap['endTime']
                         logger.info(f"Slicing telemetry for specific lap {lap_idx}: {trim_start} to {trim_end}")
                 except: pass

             df = TelemetryService.fuse_session_data(
                 db_path, 
                 output_parquet=parquet_path, 
                 target_freq=freq,
                 trim_start_time=trim_start,
                 trim_end_time=trim_end
             )
        
        df = df.replace({np.nan: None})
        
        # Build JSON response manually for speed
        logger.info(f"Serializing {len(df)} rows...")
        from fastapi import Response
        json_parts = ['{']
        for i, col in enumerate(df.columns):
            if i > 0: json_parts.append(',')
            json_parts.append(f'"{col}":{df[col].to_json(orient="values")}')
        json_parts.append('}')
        
        logger.info(f"API: Telemetry delivery complete")
        return Response(content="".join(json_parts), media_type="application/json")
        
    except Exception as e:
        logger.error(f"Error getting telemetry for {session_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/env")
async def debug_env():
    """Diagnostic endpoint for packaged environment."""
    return {
        "is_frozen": getattr(sys, 'frozen', False),
        "sys_executable": sys.executable,
        "os_getcwd": os.getcwd(),
        "APP_DATA_ROOT": APP_DATA_ROOT,
        "APP_DATA_ROOT_exists": os.path.exists(APP_DATA_ROOT),
        "files_in_data": os.listdir(APP_DATA_ROOT) if os.path.exists(APP_DATA_ROOT) else [],
        "env_duckdb_data_dir": os.environ.get('DUCKDB_DATA_DIR')
    }
