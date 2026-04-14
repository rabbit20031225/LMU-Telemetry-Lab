import duckdb

# Specific file requested by user
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-02-04T13_53_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    print(f"Connecting to {db_path}...")
    
    # Check Lap table
    print("\n--- Lap Table ---")
    try:
        laps = con.execute("SELECT * FROM \"Lap\" ORDER BY ts").df()
        print(laps.to_string())
    except Exception as e:
        print(f"Error reading Lap table: {e}")

    # Check GPS Time range for context
    print("\n--- GPS Time Range ---")
    try:
        gps_stats = con.execute("SELECT MIN(value), MAX(value) FROM \"GPS Time\"").fetchone()
        print(f"Start: {gps_stats[0]:.3f}, End: {gps_stats[1]:.3f}")
    except Exception as e:
        print(f"Error reading GPS Time: {e}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
