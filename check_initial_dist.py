import duckdb

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    print("--- Lap Dist Initial Values ---")
    # Get first few rows ordered by rowid (assuming time order)
    # We don't have 'ts' in Lap Dist, so rowid is the best proxy for "start"
    res = con.execute("SELECT rowid, value FROM \"Lap Dist\" ORDER BY rowid LIMIT 5").fetchall()
    
    for row in res:
        print(row)
        
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
