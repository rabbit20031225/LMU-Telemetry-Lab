import duckdb
import os
import json

def check_duckdb(file_path):
    print(f"Checking DB: {file_path}")
    if not os.path.exists(file_path):
        print("ERROR: File not found")
        return
        
    con = duckdb.connect(file_path, read_only=True)
    
    tables = [t[0] for t in con.execute("PRAGMA show_tables").fetchall()]
    print(f"Total Tables: {len(tables)}")
    
    # Look for relevant channels
    targets = ["Lap Dist", "Lap", "GPS Latitude", "GPS Longitude", "G Force Long", "Ground Speed"]
    found = [t for t in targets if t in tables]
    print(f"Found Channels: {found}")
    
    missing = [t for t in targets if t not in tables]
    if missing:
        print(f"MISSING Channels: {missing}")
        
    # Sample "Lap Dist"
    if "Lap Dist" in tables:
        dist_samples = con.execute('SELECT value FROM "Lap Dist" LIMIT 10').fetchall()
        print(f"Lap Dist Sample: {[v[0] for v in dist_samples]}")
    
    # Check max distance (to see if it's all zero)
    if "Lap Dist" in tables:
        max_dist = con.execute('SELECT MAX(value) FROM "Lap Dist"').fetchone()[0]
        print(f"Max Lap Dist: {max_dist}")

    # Check Lap counts
    if "Lap" in tables:
        lap_counts = con.execute('SELECT value, COUNT(*) FROM "Lap" GROUP BY value ORDER BY value').fetchall()
        print(f"Lap Groups: {lap_counts}")

    meta = con.execute("SELECT key, value FROM metadata").fetchall()
    print("Metadata:")
    for k, v in meta:
        print(f"  {k}: {v}")

    con.close()

if __name__ == "__main__":
    db = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb"
    check_duckdb(db)
    
    print("\n--- Checking Spa ---")
    spa_db = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb"
    check_duckdb(spa_db)
