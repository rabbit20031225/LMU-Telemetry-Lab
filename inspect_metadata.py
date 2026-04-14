import duckdb
import os

# Path to the duckdb file
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
output_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\metadata_inspection.txt'

try:
    with open(output_file, 'w') as f:
        con = duckdb.connect(db_path)
        
        f.write("--- Metadata Table ---\n")
        try:
            metadata_df = con.execute("SELECT * FROM \"metadata\"").df()
            f.write(metadata_df.to_string() + "\n")
        except Exception as e:
            f.write(f"Error reading metadata table: {e}\n")

except Exception as e:
    with open(output_file, 'a') as f:
        f.write(f"Global Error: {e}\n")
finally:
    if 'con' in locals():
        con.close()
