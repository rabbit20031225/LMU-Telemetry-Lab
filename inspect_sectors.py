import duckdb

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    print("--- Metadata ---")
    try:
        meta = con.execute("SELECT * FROM metadata").df()
        print(meta.to_string())
    except Exception as e:
        print(f"Error reading metadata: {e}")

    print("\n--- Lap Time ---")
    lap_time = con.execute("SELECT * FROM \"Lap Time\" ORDER BY ts").df()
    print(lap_time.to_string())

    print("\n--- Last Sector1 ---")
    try:
        s1 = con.execute("SELECT * FROM \"Last Sector1\" ORDER BY ts").df()
        print(s1.to_string())
    except:
        print("Last Sector1 not found")

    print("\n--- Last Sector2 ---")
    try:
        s2 = con.execute("SELECT * FROM \"Last Sector2\" ORDER BY ts").df()
        print(s2.to_string())
    except:
        print("Last Sector2 not found")
        
    print("\n--- Best LapTime ---")
    try:
        best = con.execute("SELECT * FROM \"Best LapTime\" ORDER BY ts").df()
        print(best.to_string())
    except: pass

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
