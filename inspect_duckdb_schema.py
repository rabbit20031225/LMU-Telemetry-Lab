import duckdb
import os
import glob

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
files = glob.glob(os.path.join(data_dir, "*.duckdb"))
if not files:
    exit(1)

db_path = files[0]
print(f"Inspecting: {db_path}")

con = duckdb.connect(db_path, read_only=True)

try:
    keys = con.execute("SELECT DISTINCT key FROM metadata ORDER BY key").fetchall()
    print("Keys found:")
    for k in keys:
        print(k[0])
except Exception as e:
    print(e)

con.close()
