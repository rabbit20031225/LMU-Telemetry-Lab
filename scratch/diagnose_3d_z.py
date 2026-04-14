import sys
import os
import numpy as np
import logging

# Setup mock logging
logging.basicConfig(level=logging.INFO)

# Set path to import items
sys.path.append(os.getcwd())

from backend.app.services.elevation_service import get_3d_track_data
from backend.app.services.telemetry_service import TelemetryService

db_path = 'DuckDB_data/Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'

def run_diagnostic():
    if not os.path.exists(db_path):
        print(f"File not found: {db_path}")
        return

    # LMU Telemetry Lab logic
    laps_header = TelemetryService.get_laps_header(db_path)
    laps_list = laps_header.get("laps", [])
    
    # Let's check Lap 2 (as in previous tests)
    lap = 2
    selected_lap = next((l for l in laps_list if l.get('lap') == lap), None)
    if not selected_lap: 
        print("Lap 2 not found")
        return
        
    lap_times = [selected_lap['startTime'], selected_lap['endTime']]
    
    # Fastest lap for base map
    valid_laps = [l for l in laps_list if l.get('isValid') and not l.get('isOutLap')]
    best_lap = min(valid_laps, key=lambda x: x['duration'])
    base_times = [best_lap['startTime'], best_lap['endTime']]

    print(f"--- Diagnosing Track Data (Lap {lap}) ---")
    data = get_3d_track_data(db_path, lap_times, base_times, "Monza")
    
    base_map = data["baseMap"]
    racing_line = data["racingLine"]
    
    print(f"Points in BaseMap: {len(base_map)}")
    if base_map:
        print("\nBaseMap - First 5 Z values:")
        for i in range(5):
            p = base_map[i]
            print(f"  idx {i}: Z={p['z']:.4f}, Dist={p['d']:.2f}")
            
        print("\nBaseMap - Last 5 Z values:")
        for i in range(len(base_map)-5, len(base_map)):
            p = base_map[i]
            print(f"  idx {i}: Z={p['z']:.4f}, Dist={p['d']:.2f}")

    if racing_line:
        print("\nRacingLine - First 5 Z values:")
        for i in range(5):
            p = racing_line[i]
            print(f"  idx {i}: Z={p['z']:.4f}")

    # Stats
    zs = [p['z'] for p in base_map]
    print(f"\nStats - Min Z: {np.min(zs):.6f}, Max Z: {np.max(zs):.6f}, Mean Z: {np.mean(zs):.6f}")

if __name__ == "__main__":
    run_diagnostic()
