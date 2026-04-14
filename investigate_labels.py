import duckdb
import os

d = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(d) if f.endswith('.duckdb')])

print('| File | Class | Compounds | Start Value (W0) |')
print('|---|---|---|---|')

for f in files:
    try:
        path = os.path.join(d, f)
        con = duckdb.connect(path, read_only=True)
        cls = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()[0]
        
        try:
            res = con.execute("SELECT DISTINCT value1, value2, value3, value4 FROM TyresCompound").fetchall()
            vals = sorted(list(set(int(x) for r in res for x in r if x is not None)))
            
            # Get the very first recording of TyresCompound
            first_row = con.execute("SELECT value1 FROM TyresCompound ORDER BY ts LIMIT 1").fetchone()
            first_val = int(first_row[0]) if first_row else "N/A"
            
            print(f"| {f} | {cls} | {vals} | {first_val} |")
        except:
            print(f"| {f} | {cls} | N/A | N/A |")
        con.close()
    except:
        pass
