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
            res = con.execute("SELECT DISTINCT value1, value2, value3, value4 FROM TyresCompound").fetchall()
            indices = sorted(list(set(int(x) for r in res for x in r if x is not None)))
            print(f"{f} | Class: '{cls}' | Indices: {indices}")
        except:
            print(f"{f} | Class: '{cls}' | No TyresCompound")
        con.close()
    except Exception as e:
        pass
