import duckdb
import os

d = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(d) if f.endswith('.duckdb')])

print('| File | Class | Total Rows | Null Rows (value1) |')
print('|---|---|---|---|')

for f in files:
    try:
        path = os.path.join(d, f)
        con = duckdb.connect(path, read_only=True)
        cls_row = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        cls = cls_row[0] if cls_row else "N/A"
        
        try:
            count = con.execute("SELECT count(*) FROM TyresCompound").fetchone()[0]
            nulls = con.execute("SELECT count(*) FROM TyresCompound WHERE value1 IS NULL").fetchone()[0]
            print(f"| {f} | {cls} | {count} | {nulls} |")
        except:
            print(f"| {f} | {cls} | TABLE ERR | ERR |")
            
        con.close()
    except Exception as e:
        pass
