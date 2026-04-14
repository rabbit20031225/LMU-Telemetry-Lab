import duckdb
import os

DB_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(DB_PATH)
    # Query ONLY specific keys
    rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('CarName', 'CarClass', 'DriverName', 'SessionType')").fetchall()
    print("Metadata Found:")
    for key, val in rows:
        print(f"{key}: {val}")
        
    con.close()
except Exception as e:
    print(f"Error: {e}")
