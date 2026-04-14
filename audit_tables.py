import duckdb
import os

d = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(d) if f.endswith('.duckdb')])

for f in files:
    try:
        path = os.path.join(d, f)
        con = duckdb.connect(path, read_only=True)
        tables = [t[0] for t in con.execute('SHOW TABLES').fetchall()]
        cls_row = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        cls = cls_row[0] if cls_row else "N/A"
        
        if 'TyresCompound' not in tables:
            print(f"MISSING: {f} | Class: {cls}")
            # Check for potential synonyms
            synonyms = [t for t in tables if 'Tyre' in t or 'Compound' in t]
            if synonyms:
                print(f"  Possible synonyms: {synonyms}")
        con.close()
    except Exception as e:
        print(f"ERROR: {f} | {e}")
