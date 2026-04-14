
import sys
import os
import json

# Add backend to path (if not already)
# Assume running from root: backend/test_laps.py
# Add parent dir of this script
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import app modules
from app.services.telemetry_service import TelemetryService

DB_PATH = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb"

try:
    print(f"Testing get_laps_header on {DB_PATH}...")
    laps = TelemetryService.get_laps_header(DB_PATH)
    print(json.dumps(laps, indent=2))
except Exception as e:
    print(f"Error: {e}")
