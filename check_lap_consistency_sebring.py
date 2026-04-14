import duckdb

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    print("--- Lap Table ---")
    try:
        laps = con.execute("SELECT * FROM \"Lap\" ORDER BY ts").df()
        print(laps.to_string())
    except Exception as e:
        print(f"Error reading Lap: {e}")

    print("\n--- Lap Time Table ---")
    try:
        lap_times = con.execute("SELECT * FROM \"Lap Time\" ORDER BY ts").df()
        print(lap_times.to_string())
    except Exception as e:
        print(f"Error reading Lap Time: {e}")
        
    print("\n--- GPS Time Start ---")
    try:
        start_time = con.execute("SELECT MIN(value) FROM \"GPS Time\"").fetchone()[0]
        print(f"Start: {start_time:.3f}")
    except:
        pass

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
