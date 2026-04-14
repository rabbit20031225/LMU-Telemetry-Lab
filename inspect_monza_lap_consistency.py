import duckdb

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-02-04T13_53_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    with open('monza_lap_inspection.txt', 'w') as f:
        f.write("--- Lap Table (Monza) ---\n")
        try:
            laps = con.execute("SELECT * FROM \"Lap\" ORDER BY ts").df()
            f.write(laps.to_string() + "\n")
        except Exception as e:
            f.write(f"Error reading Lap: {e}\n")

        f.write("\n--- Lap Time Table (Monza) ---\n")
        try:
            lap_times = con.execute("SELECT * FROM \"Lap Time\" ORDER BY ts").df()
            f.write(lap_times.to_string() + "\n")
        except Exception as e:
            f.write(f"Error reading Lap Time: {e}\n")
            
        f.write("\n--- GPS Time Start (Monza) ---\n")
        try:
            start_time = con.execute("SELECT MIN(value) FROM \"GPS Time\"").fetchone()[0]
            f.write(f"Start: {start_time:.3f}\n")
        except:
            pass

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
