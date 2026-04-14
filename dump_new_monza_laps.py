import duckdb
import pandas as pd

# Set pandas to show all rows
pd.set_option('display.max_rows', None)

# Path to the NEW Monza file
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-02-08T15_39_43Z.duckdb'
output_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\new_monza_laps.txt'

try:
    con = duckdb.connect(db_path)
    
    with open(output_file, 'w') as f:
        f.write("--- Lap Table (New Monza 2026-02-08) ---\n")
        laps = con.execute("SELECT * FROM \"Lap\" ORDER BY ts").df()
        f.write(laps.to_string() + "\n")

        f.write("\n--- Lap Time Table (New Monza 2026-02-08) ---\n")
        lap_times = con.execute("SELECT * FROM \"Lap Time\" ORDER BY ts").df()
        f.write(lap_times.to_string() + "\n")
        
        f.write("\n--- GPS Time Info ---\n")
        gps_stats = con.execute("SELECT MIN(value) as start, MAX(value) as end FROM \"GPS Time\"").fetchone()
        f.write(f"Start: {gps_stats[0]:.3f}, End: {gps_stats[1]:.3f}\n")

    print(f"Dumped to {output_file}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
