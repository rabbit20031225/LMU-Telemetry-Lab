import duckdb
import os

d = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(d) if f.endswith('.duckdb')])

for f in files:
    try:
        path = os.path.join(d, f)
        con = duckdb.connect(path, read_only=True)
        cls_row = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        cls = cls_row[0] if cls_row else "N/A"
        
        try:
            cols = [c[0] for c in con.execute("DESCRIBE TyresCompound").fetchall()]
            print(f"{f} | {cls} | {cols}")
        except:
            print(f"{f} | {cls} | TABLE MISSING")
            
        con.close()
    except Exception as e:
        print(f"Error on {f}: {e}")
