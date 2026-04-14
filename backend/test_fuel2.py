import duckdb
import os
data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

con = duckdb.connect(db_path, read_only=True)
print(con.execute("DESCRIBE \"Fuel Level\"").df())
