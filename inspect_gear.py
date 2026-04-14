import duckdb

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    print("--- Gear Table Inspection ---")
    try:
        # Check schema
        cols = con.execute("DESCRIBE \"Gear\"").fetchall()
        print(f"Schema: {cols}")
        
        # Get first 10 rows
        print("\nFirst 10 Rows:")
        rows = con.execute("SELECT * FROM \"Gear\" ORDER BY ts LIMIT 10").df()
        print(rows.to_string())
        
        # Get distinct values
        print("\nDistinct Gears:")
        distinct = con.execute("SELECT DISTINCT value FROM \"Gear\" ORDER BY value").fetchall()
        print([x[0] for x in distinct])
        
    except Exception as e:
        print(f"Error reading Gear table: {e}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
