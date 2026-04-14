import duckdb
import os

d = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(d) if f.endswith('.duckdb')])

print('| File | CarClass | Compounds Found |')
print('|---|---|---|')

for f in files:
    try:
        path = os.path.join(d, f)
        con = duckdb.connect(path, read_only=True)
        
        # Get CarClass
        res_cls = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        cls = res_cls[0] if res_cls else "N/A"
        
        # Get Unique TyresCompound values
        try:
            res_comp = con.execute("SELECT DISTINCT value1, value2, value3, value4 FROM TyresCompound").fetchall()
            vals = set()
            for row in res_comp:
                for v in row:
                    if v is not None:
                        vals.add(int(v) if float(v).is_integer() else v)
            comp_list = sorted(list(vals))
        except:
            comp_list = "MISSING TABLE"
            
        print(f"| {f} | {cls} | {comp_list} |")
        con.close()
    except Exception as e:
        pass
