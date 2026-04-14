import duckdb
import numpy as np
import pandas as pd

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'

def inspect():
    con = duckdb.connect(DB_PATH, read_only=True)
    
    # Check Session start
    t0 = con.execute('SELECT min(value) FROM "GPS Time"').fetchone()[0]
    print(f"\nSession Start Time (T0): {t0}")

    # Check Lap triggers
    print("--- Lap Triggers ---")
    laps = con.execute('SELECT rowid, ts, value FROM "Lap"').df()
    print(laps)
    
    # Check Ground Speed length
    speed_count = con.execute('SELECT count(*) FROM "Ground Speed"').fetchone()[0]
    print(f"\nGround Speed Data Points (Total): {speed_count}")
    
    # Check Lap Dist (Max value)
    dist_max = con.execute('SELECT max(value) FROM "Lap Dist"').fetchone()[0]
    print(f"Max distance in any lap: {dist_max}")

    con.close()

if __name__ == "__main__":
    inspect()
