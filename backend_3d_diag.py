import sys
import os
import json
import logging

# Setup paths
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.elevation_service import get_3d_track_data
from app.services.telemetry_service import TelemetryService

# Configure logging
logging.basicConfig(level=logging.INFO)

def diagnose():
    # Use a real session ID from the environment if possible, or dummy
    # Since I don't have the active session ID, I'll try to find one from the database
    db_path = "backend/data/telemetry.db"
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    import duckdb
    conn = duckdb.connect(db_path)
    sessions = conn.execute("SELECT session_id, track_name FROM session_metadata LIMIT 1").fetchone()
    if not sessions:
        print("No sessions found in DB")
        return
    
    session_id, track_name = sessions
    # Get a random lap for this session
    lap = conn.execute(f"SELECT lap, stint, start_time, end_time FROM laps WHERE session_id = '{session_id}' LIMIT 1").fetchone()
    if not lap:
        print("No laps found")
        return
    
    lap_num, stint, start_t, end_t = lap
    print(f"Diagnosing Session: {session_id}, Track: {track_name}, Lap: {lap_num}")

    try:
        # We need to simulate the profile_id too
        profile_id = 'default' # Just a placeholder
        res = get_3d_track_data(session_id, lap_num, profile_id)
        
        print("\n--- Diagnostic Results ---")
        print(f"BaseMap length: {len(res.get('baseMap', []))}")
        print(f"RacingLine length: {len(res.get('racingLine', []))}")
        print(f"Center: {res.get('center')}")
        
        if len(res.get('baseMap', [])) > 0:
            print(f"First BaseMap point: {res['baseMap'][0]}")
        else:
            print("ERROR: BaseMap is EMPTY!")
            
    except Exception as e:
        print(f"CRITICAL ERROR during get_3d_track_data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnose()
