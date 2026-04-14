import os
import duckdb
import sys

# Add backend directory to sys.path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

try:
    from app.services.telemetry_service import TelemetryService
except ImportError:
    # Try alternate relative path
    sys.path.insert(0, os.getcwd())
    from backend.app.services.telemetry_service import TelemetryService

db_path = r"C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb"

if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
    sys.exit(1)

laps_header = TelemetryService.get_laps_header(db_path)
laps_list = laps_header.get("laps", [])

# Logic from reverted endpoints.py:
# valid_laps = [l for l in stint_laps if l.get('isValid') and not l.get('isOutLap')]
# stint is None in the default session load

valid_laps = [l for l in laps_list if l.get('isValid') and not l.get('isOutLap')]

if valid_laps:
    best_lap = min(valid_laps, key=lambda x: x['duration'])
    print(f"--- 診斷結果 ---")
    print(f"底圖圈數 (Fastest Lap Num): {best_lap['lap']}")
    print(f"時間 (Duration): {best_lap['duration']:.3f}s")
    print(f"屬性: isValid={best_lap['isValid']}, isOutLap={best_lap['isOutLap']}, isInLap={best_lap.get('inPit', False)}")
else:
    # Fallback to longest
    if laps_list:
        best_lap = max(laps_list, key=lambda x: x['duration'])
        print(f"--- 診斷結果 (Fallback 到最長圈) ---")
        print(f"底圖圈數: {best_lap['lap']}")
        print(f"原因: 沒有找到有效的 Flying Lap")
    else:
        print("資料庫中沒有圈數數據")
