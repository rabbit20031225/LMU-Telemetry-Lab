import duckdb
import pandas as pd

# Set pandas to show all rows
pd.set_option('display.max_rows', None)

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-02-04T13_53_44Z.duckdb'
output_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\monza_full_laps.txt'

try:
    con = duckdb.connect(db_path)
    
    with open(output_file, 'w') as f:
        f.write("--- Lap Table (Monza) ---\n")
        laps = con.execute("SELECT * FROM \"Lap\" ORDER BY ts").df()
        f.write(laps.to_string() + "\n")

        f.write("\n--- Lap Time Table (Monza) ---\n")
        lap_times = con.execute("SELECT * FROM \"Lap Time\" ORDER BY ts").df()
        f.write(lap_times.to_string() + "\n")

    print(f"Dumped to {output_file}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
