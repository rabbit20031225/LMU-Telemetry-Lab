import duckdb
import numpy as np
import sys
import os

# Add local path to sys.path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.elevation_service import get_3d_track_data

def test_integration():
    # Use the existing Spa DuckDB for testing
    DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'
    
    if not os.path.exists(DB_PATH):
        print(f"Test DB not found: {DB_PATH}")
        return

    with duckdb.connect(DB_PATH, read_only=True) as con:
        # 1. Test Spa-Francorchamps Default
        print("\n--- Testing Spa-Francorchamps (Manual Mapping) ---")
        data = get_3d_track_data(con, lap_num=3, track_name="Circuit de Spa-Francorchamps", track_layout="Default")
        
        if data:
            z_values = [p['z'] for p in data]
            min_z = min(z_values)
            max_z = max(z_values)
            print(f"Elevation Range: {min_z:.2f}m to {max_z:.2f}m")
            
            # Spa Reference Points: min 358m, max 468m
            # Check if range is roughly consistent with manual points (approx 110m)
            z_range = max_z - min_z
            print(f"Total Range: {z_range:.2f}m")
            if 100 < z_range < 120:
                print("SUCCESS: Manual mapping range looks correct.")
            else:
                print("WARNING: Manual mapping range looks unexpected.")
        else:
            print("FAILED: No data returned for Spa.")

        # 2. Test Fallback (Unknown Track)
        print("\n--- Testing Fallback (Unknown Track) ---")
        data_fallback = get_3d_track_data(con, lap_num=3, track_name="Unknown Circuit X")
        
        if data_fallback:
            z_values = [p['z'] for p in data_fallback]
            print(f"Fallback Elevation Range: {min(z_values):.2f}m to {max(z_values):.2f}m")
            print("SUCCESS: Fallback logic works.")
        else:
            print("FAILED: Fallback logic returned no data.")

if __name__ == "__main__":
    test_integration()
