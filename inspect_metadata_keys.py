import duckdb

# Path to the duckdb file
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    print("--- Time-related Metadata Keys ---")
    query = """
    SELECT key, value FROM "metadata" 
    WHERE key ILIKE '%Time%' 
       OR key ILIKE '%Date%' 
       OR key ILIKE '%Start%'
       OR key ILIKE '%Session%'
    """
    results = con.execute(query).fetchall()
    
    if not results:
        print("No matching keys found.")
    else:
        for row in results:
            print(f"{row[0]}: {row[1]}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
