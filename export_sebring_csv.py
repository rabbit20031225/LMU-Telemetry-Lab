import sys
import os
import pandas as pd

# Add backend to path so we can import app
# backend/app -> we want to import app.services
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app.services.telemetry_service import TelemetryService
except ImportError as e:
    print(f"Import Error: {e}")
    # Try importing without app prefix if running from inside backend? No.
    # Try alternate path
    sys.path.append(os.getcwd())
    from backend.app.services.telemetry_service import TelemetryService

# Config

# Config
DATA_DIR = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
SESSION_ID = "Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb"
DB_PATH = os.path.join(DATA_DIR, SESSION_ID)
OUTPUT_CSV = "sebring_debug_dump_final.csv"

def export_csv():
    print(f"Loading session: {SESSION_ID}")
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return

    try:
        # Fuse Data (Run the exact backend logic)
        df = TelemetryService.fuse_session_data(DB_PATH)
        
        # Export ALL columns
        print(f"Exporting ALL columns to {OUTPUT_CSV}...")
        # Sort columns for consistency?
        # Ensure Time, Lap, Lap Dist are first
        cols = list(df.columns)
        priorities = ['Time', 'Lap', 'Lap Dist', 'Ground Speed', 'GPS Speed', 'Throttle', 'Brake']
        ordered_cols = [c for c in priorities if c in cols] + [c for c in cols if c not in priorities]
        
        out_df = df[ordered_cols]
        out_df.to_csv(OUTPUT_CSV, index=False)
        print("Done.")
        
        # Print snippet for log
        print(out_df.head())
        
    except Exception as e:
        print(f"Error exporting CSV: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    export_csv()
