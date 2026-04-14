import duckdb
import os
import numpy as np

db_path = 'DuckDB_data/Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
else:
    con = duckdb.connect(db_path, read_only=True)
    try:
        print("--- checking GPS Altitude ---")
        zeros = con.execute('SELECT ts, value FROM "GPS Altitude" WHERE value = 0').fetchall()
        print(f"Zeros in Altitude: {len(zeros)}")
        if zeros: print(zeros[:5])

        print("\n--- checking GPS Latitude ---")
        lzeros = con.execute('SELECT ts, value FROM "GPS Latitude" WHERE value = 0').fetchall()
        print(f"Zeros in Latitude: {len(lzeros)}")
        
        print("\n--- First 10 rows of synchronized channels ---")
        # Try to simulate fusion briefly
        t = con.execute('SELECT value FROM "GPS Time" LIMIT 10').df()['value'].values
        a = con.execute('SELECT value FROM "GPS Altitude" LIMIT 10').df()['value'].values
        d = con.execute('SELECT value FROM "Lap Dist" LIMIT 10').df()['value'].values
        for i in range(len(t)):
            print(f"T: {t[i]:.3f}, Alt: {a[i]}, Dist: {d[i]}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        con.close()
