import duckdb
import pandas as pd

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    with open('pit_lap_inspection.txt', 'w') as f:
        f.write("--- Lap Table ---\n")
        laps = con.execute("SELECT * FROM \"Lap\" ORDER BY ts").df()
        f.write(laps.to_string() + "\n")

        f.write("\n--- Lap Time Table ---\n")
        lap_times = con.execute("SELECT * FROM \"Lap Time\" ORDER BY ts").df()
        f.write(lap_times.to_string() + "\n")
        
        f.write("\n--- In Pits Table ---\n")
        try:
            count = con.execute("SELECT COUNT(*) FROM \"In Pits\"").fetchone()[0]
            f.write(f"Row count: {count}\n")
            if count > 0:
                in_pits = con.execute("SELECT * FROM \"In Pits\" ORDER BY ts").df()
                f.write(in_pits.to_string() + "\n")
            else:
                f.write("Table is empty.\n")
        except Exception as e:
            f.write(f"Error reading In Pits: {e}\n")
            
        f.write("\n--- GPS Speed Info ---\n")
        gps_speed_count = con.execute("SELECT COUNT(*) FROM \"GPS Speed\"").fetchone()[0]
        f.write(f"GPS Speed Row Count: {gps_speed_count}\n")
        
        gps_time_count = con.execute("SELECT COUNT(*) FROM \"GPS Time\"").fetchone()[0]
        f.write(f"GPS Time Row Count: {gps_time_count}\n")

        # Integration speed check
        import time
        import numpy as np
        
        target_points = 500000
        f.write(f"\nTesting integration on {target_points} points...\n")
        t0 = time.time()
        dummy_data = np.random.rand(target_points)
        dist = np.cumsum(dummy_data * 0.001)
        t1 = time.time()
        f.write(f"Integration took {t1-t0:.6f} seconds.\n")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
