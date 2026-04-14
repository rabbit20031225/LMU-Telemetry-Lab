import duckdb
import os
import pandas as pd

# Path to the duckdb file
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
output_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\time_comparison.txt'

try:
    with open(output_file, 'w') as f:
        con = duckdb.connect(db_path)
        
        # 1. Analyze GPS Time
        f.write("--- Analysis of 'GPS Time' ---\n")
        try:
            gps_stats = con.execute("SELECT MIN(value), MAX(value), COUNT(value) FROM \"GPS Time\"").fetchone()
            f.write(f"Min: {gps_stats[0]}, Max: {gps_stats[1]}, Count: {gps_stats[2]}\n")
            
            # Check monotonicity and delta
            delta_stats = con.execute("""
                SELECT 
                    AVG(value - lag_value) as avg_delta,
                    MIN(value - lag_value) as min_delta,
                    MAX(value - lag_value) as max_delta
                FROM (
                    SELECT value, LAG(value) OVER (ORDER BY rowid) as lag_value
                    FROM \"GPS Time\"
                )
            """).fetchone()
            f.write(f"Delta (Avg/Min/Max): {delta_stats[0]} / {delta_stats[1]} / {delta_stats[2]}\n")
             # Get first 10
            f.write("First 10 values:\n")
            head = con.execute("SELECT value FROM \"GPS Time\" LIMIT 10").df()
            f.write(head.to_string() + "\n")

        except Exception as e:
            f.write(f"Error analyzing GPS Time: {e}\n")

        # 2. Analyze ts in Lap table
        f.write("\n--- Analysis of 'ts' in 'Lap' table ---\n")
        try:
            lap_data = con.execute("SELECT * FROM \"Lap\"").df()
            f.write(lap_data.to_string() + "\n")
        except Exception as e:
            f.write(f"Error analyzing Lap table: {e}\n")

        # 3. Check for 'ts' column in other tables
        f.write("\n--- Tables with 'ts' column ---\n")
        tables = con.execute("SHOW TABLES").fetchall()
        for table in tables:
            table_name = table[0]
            columns = con.execute(f"DESCRIBE \"{table_name}\"").fetchall()
            col_names = [col[0] for col in columns]
            if 'ts' in col_names:
                f.write(f"Table '{table_name}' has 'ts' column. Schema: {col_names}\n")
                # Sample
                sample = con.execute(f"SELECT * FROM \"{table_name}\" LIMIT 3").df()
                f.write(f"Sample from {table_name}:\n{sample.to_string()}\n\n")

except Exception as e:
    with open(output_file, 'a') as f:
        f.write(f"Global Error: {e}\n")
finally:
    if 'con' in locals():
        con.close()
