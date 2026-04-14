import duckdb
import os

db_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'

for filename in os.listdir(db_dir):
    if filename.endswith(".duckdb"):
        db_path = os.path.join(db_dir, filename)
        try:
            con = duckdb.connect(db_path)
            keys = [row[0] for row in con.execute('SELECT key FROM "metadata"').fetchall()]
            print(f"--- {filename} ---")
            print(f"Keys: {keys[:10]}... (Total {len(keys)})")
            if "CarSetup" in keys:
                print("Found CarSetup key!")
            con.close()
        except:
            pass
