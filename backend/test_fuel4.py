import os
import numpy as np
import duckdb

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

con = duckdb.connect(db_path, read_only=True)
gps_times = con.execute("SELECT value FROM \"GPS Time\" ORDER BY rowid").df()['value'].values
fuel_df = con.execute("SELECT value FROM \"Fuel Level\" ORDER BY rowid").df()
fuel_vals = fuel_df['value'].values

current_indices = np.linspace(0, len(gps_times)-1, len(fuel_vals))
fuel_ts = np.interp(current_indices, np.arange(len(gps_times)), gps_times)

lap_times = con.execute("SELECT ts, value FROM \"Lap Time\" ORDER BY ts").fetchall()
t_start = gps_times[0]
for lap_tuple in lap_times[:5]:
    t_end = lap_tuple[0]
    idx_start = np.searchsorted(fuel_ts, t_start)
    idx_end = np.searchsorted(fuel_ts, t_end)
    lap_fuel_vals = fuel_vals[idx_start:idx_end]
    lap_fuel_used = 0.0
    if len(lap_fuel_vals) > 1:
        diffs = lap_fuel_vals[:-1] - lap_fuel_vals[1:]
        lap_fuel_used = float(np.sum(diffs[diffs > 0]))
        
    print(f"Lap {lap_tuple[1]}\t StartIdx: {idx_start} EndIdx: {idx_end} len: {len(lap_fuel_vals)}\t Fuel Used: {lap_fuel_used:.2f}L")
    t_start = t_end
