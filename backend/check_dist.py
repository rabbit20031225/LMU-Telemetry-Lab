import duckdb
import pandas as pd
import numpy as np

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'

def check_dist():
    con = duckdb.connect(DB_PATH, read_only=True)
    df_time = con.execute('SELECT value FROM "GPS Time" ORDER BY rowid').df()
    df_dist = con.execute('SELECT value FROM "Lap Dist" ORDER BY rowid').df()
    con.close()
    
    t = df_time['value'].values
    d_raw = df_dist['value'].values
    
    # Interpolate
    src_indices = np.linspace(0, len(t)-1, len(d_raw))
    source_time = np.interp(src_indices, np.arange(len(t)), t)
    d_interp = np.interp(t, source_time, d_raw)
    
    dd = np.diff(d_interp)
    print(f"Max DD: {np.max(dd):.4f}m")
    print(f"Min DD: {np.min(dd):.4f}m")
    print(f"Count of DD > 50m: {np.sum(np.abs(dd) > 50)}")
    
    # Check near resets
    resets = np.where(dd < -100)[0]
    print(f"Resets found at indices: {resets[:5]}")

if __name__ == "__main__":
    check_dist()
