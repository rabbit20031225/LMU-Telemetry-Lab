import duckdb

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    print("--- GPS Speed Statistics ---")
    stats = con.execute("SELECT MIN(value), MAX(value), AVG(value) FROM \"GPS Speed\"").fetchone()
    print(f"Min: {stats[0]:.2f}, Max: {stats[1]:.2f}, Avg: {stats[2]:.2f}")
    
    print("\n--- Channels List Info for GPS Speed ---")
    try:
        # Assuming channelsList has 'Name' and 'Units' or similar columns. 
        # Checking schema first would be ideal but let's guess standard naming or just dump row
        # Schema from previous memory: likely Name, Unit...
        # Let's check schema of channelsList first
        cols = [c[0] for c in con.execute("DESCRIBE channelsList").fetchall()]
        print(f"Schema: {cols}")
        
        # Schema is seemingly (Name, Freq, Unit)
        # Check specific row
        row = con.execute("SELECT * FROM channelsList WHERE name = 'GPS Speed'").fetchone()
        if row:
            print(f"GPS Speed Info: {row}")
        else:
            print("GPS Speed not found in channelsList")
            
        print("\n--- GPS Speed Values ---")
        stats = con.execute("SELECT MIN(value), MAX(value), AVG(value) FROM \"GPS Speed\"").fetchone()
        print(f"Min: {stats[0]:.2f}")
        print(f"Max: {stats[1]:.2f}")
        print(f"Avg: {stats[2]:.2f}")

            
    except Exception as e:
        print(f"Error reading channelsList: {e}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
