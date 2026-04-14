import os
import numpy as np
import duckdb

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

con = duckdb.connect(db_path, read_only=True)
gps_times = con.execute("SELECT value FROM \"GPS Time\" ORDER BY rowid").df()['value'].values
fuel_vals = con.execute("SELECT value FROM \"Fuel Level\" ORDER BY rowid").df()['value'].values

current_indices = np.linspace(0, len(gps_times)-1, len(fuel_vals))
fuel_ts = np.interp(current_indices, np.arange(len(gps_times)), gps_times)

print("GPS Start", gps_times[0], "End", gps_times[-1])
print("Fuel TS Start", fuel_ts[0], "End", fuel_ts[-1])

print("Len GPS", len(gps_times), "Len Fuel", len(fuel_vals))

lap_query = "SELECT lap, startTime, endTime FROM (SELECT value as lap, MIN(ts) as startTime, MAX(ts) as endTime FROM \"Lap\" GROUP BY value ORDER BY value) LIMIT 3"
# Wait, "Lap" has ts? Actually in TelemetryService, laps are determined by lap_times.
# Let's just emulate lap boundaries manually.
lap_times_rows = con.execute("SELECT ts, value FROM \"Lap Time\" ORDER BY ts LIMIT 3").fetchall()
print("Lap Times:", lap_times_rows)
