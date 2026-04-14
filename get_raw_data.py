import duckdb
import os

d = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(d) if f.endswith('.duckdb')])

print('| File | Raw Metadata (CarClass) | Raw TyresCompound Values |')
print('|---|---|---|')

for f in files:
    try:
        path = os.path.join(d, f)
        con = duckdb.connect(path, read_only=True)
        
        # Get raw CarClass from metadata
        res_cls = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        raw_cls = res_cls[0] if res_cls else "N/A"
        
        # Get raw unique values from TyresCompound
        try:
            res_comp = con.execute("SELECT DISTINCT value1, value2, value3, value4 FROM TyresCompound").fetchall()
            # Collect all unique values across all 4 wheels
            unique_vals = set()
            for row in res_comp:
                for v in row:
                    if v is not None:
                        # Convert to int if it's a whole number for cleaner display
                        unique_vals.add(int(v) if float(v).is_integer() else v)
            raw_compounds = sorted(list(unique_vals))
        except:
            raw_compounds = "Table Missing"
            
        print(f"| {f} | {raw_cls} | {raw_compounds} |")
        con.close()
    except Exception as e:
        print(f"| {f} | Error: {str(e)[:20]} | N/A |")
