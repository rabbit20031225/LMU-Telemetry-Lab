import os
import numpy as np
import duckdb
from app.services.telemetry_service import TelemetryService

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

con = duckdb.connect(db_path, read_only=True)
fuel_df = con.execute("SELECT value FROM \"Fuel Level\" ORDER BY rowid LIMIT 10").df()
print("Fuel Level Head:")
print(fuel_df['value'].values)

header = TelemetryService.get_laps_header(db_path)
print("Lap 1:", header['laps'][0]['fuelUsed'])
print("Lap 2:", header['laps'][1]['fuelUsed'])
print("Lap 3:", header['laps'][2]['fuelUsed'])
