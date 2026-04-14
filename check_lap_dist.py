import duckdb

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    # Check GPS Time
    gps_count = con.execute("SELECT COUNT(*) FROM \"GPS Time\"").fetchone()[0]
    print(f"GPS Time rows: {gps_count}")
    
    # Check Lap Dist
    print("\n--- Lap Dist ---")
    schema = con.execute("DESCRIBE \"Lap Dist\"").fetchall()
    col_names = [col[0] for col in schema]
    print(f"Schema: {col_names}")
    
    dist_count = con.execute("SELECT COUNT(*) FROM \"Lap Dist\"").fetchone()[0]
    print(f"Row count: {dist_count}")
    
    if 'ts' in col_names:
        print("Has 'ts' column: YES (Event-based)")
    else:
        print("Has 'ts' column: NO (Continuous)")
        
    if gps_count == dist_count:
        print("Alignment: PERFECT MATCH (Same row count as GPS Time)")
    else:
        print(f"Alignment: Resampled (Ratio: {dist_count/gps_count:.4f})")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
