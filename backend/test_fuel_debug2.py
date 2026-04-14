import os
import numpy as np
import duckdb

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

con = duckdb.connect(db_path, read_only=True)
fuel_df = con.execute("SELECT value FROM \"Fuel Level\" ORDER BY rowid").df()
fuel_vals = fuel_df['value'].values
print("Max Fuel:", np.max(fuel_vals))
print("Min Fuel:", np.min(fuel_vals))
print("Mean Fuel:", np.mean(fuel_vals))
