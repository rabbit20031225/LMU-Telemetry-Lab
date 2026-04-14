import duckdb
import os
import sys

# Path to the duckdb file
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'
output_file = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\inspection_result.txt'

try:
    with open(output_file, 'w') as f:
        con = duckdb.connect(db_path)
        
        # List tables
        f.write("Tables and Row Counts:\n")
        tables = con.execute("SHOW TABLES").fetchall()
        existing_tables = []
        for table in tables:
            table_name = table[0]
            existing_tables.append(table_name)
            try:
                row_count = con.execute(f"SELECT COUNT(*) FROM \"{table_name}\"").fetchone()[0]
                f.write(f"{table_name}: {row_count} rows\n")
            except Exception as e:
                f.write(f"{table_name}: Error counting rows - {e}\n")
            
        # Inspect a few key tables if they exist
        key_tables = ['Speed', 'Lap', 'Lap Dist', 'Steer', 'Throttle', 'Brake', 'channelsList', 'Wheel Speed', 'GPS Speed']
        f.write("\n--- Detailed Inspection of Key Tables ---\n")
        
        for table_name in key_tables:
            if table_name in existing_tables:
                f.write(f"\n--- Table: {table_name} ---\n")
                
                # Show schema
                f.write("Schema:\n")
                schema = con.execute(f"DESCRIBE \"{table_name}\"").fetchall()
                for col in schema:
                    f.write(f"  {col[0]} ({col[1]})\n")
                
                # Show sample data
                f.write("\nSample Data (first 5 rows):\n")
                sample = con.execute(f"SELECT * FROM \"{table_name}\" LIMIT 5").df()
                f.write(sample.to_string() + "\n")
            else:
                 f.write(f"\nTable '{table_name}' not found.\n")

except Exception as e:
    with open(output_file, 'a') as f:
        f.write(f"Error: {e}\n")
finally:
    if 'con' in locals():
        con.close()
