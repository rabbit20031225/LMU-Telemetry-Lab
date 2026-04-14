import duckdb
import pandas as pd
import json

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    # 1. Broad Search in Metadata
    print("--- Metadata Search ---")
    try:
        meta_df = con.execute("SELECT * FROM metadata").df()
        for _, row in meta_df.iterrows():
            k = str(row['key']).lower()
            v = str(row['value']).lower()
            if 'length' in k or 'dist' in k or 'meter' in k or 'km' in k or 'track' in k:
                 print(f"{row['key']}: {row['value']}")
    except:
        print("Metadata read failed")

    # 2. Check Session Info
    print("\n--- Session Info Search ---")
    try:
        sess = con.execute("SELECT * FROM \"Session Info\"").df()
        for col in sess.columns:
            print(f"{col}: {sess[col].values}")
    except:
        print("Session Info not found/empty")
        
    # 3. Check Lap Dist max values?
    print("\n--- Lap Dist Max Scan (per lap) ---")
    # We can use our fused data or raw data
    # Let's check raw Lap Dist stats
    # Group by Lap? No Lap column in Lap Dist table.
    # But we know Lap boundaries from Lap table.
    
    laps = con.execute("SELECT ts, value FROM \"Lap\" ORDER BY ts").fetchall()
    lap_starts = [l[0] for l in laps]
    
    # Get max Lap Dist value roughly
    max_dist = con.execute("SELECT MAX(value) FROM \"Lap Dist\"").fetchone()[0]
    print(f"Max observed Lap Dist: {max_dist}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
