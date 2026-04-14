import duckdb
import os
import glob

DATA_DIR = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = glob.glob(os.path.join(DATA_DIR, '*.duckdb'))

con = duckdb.connect(files[0], read_only=True)

def inspect_table(table_name):
    cols = [c[0] for c in con.execute(f'DESCRIBE "{table_name}"').fetchall()]
    print(f"\n--- {table_name} Columns: {cols} ---")
    data = con.execute(f'SELECT * FROM "{table_name}" LIMIT 20').fetchall()
    print(f"Data: {data}")
    count = con.execute(f'SELECT count(*) FROM "{table_name}"').fetchone()[0]
    print(f"Count: {count}")

try:
    inspect_table("Path Lateral")
    inspect_table("Track Edge")
    inspect_table("GPS Time")
except Exception as e:
    print(f"Error: {e}")
finally:
    con.close()
