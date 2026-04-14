# -*- coding: utf-8 -*-
import duckdb
import os

db_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(db_dir) if f.endswith('.duckdb')])

print(f"| {'File':<70} | {'Class':<12} | {'Compound':<10} |")
print("|" + "-"*72 + "|" + "-"*14 + "|" + "-"*12 + "|")

for f in files:
    path = os.path.join(db_dir, f)
    try:
        con = duckdb.connect(path, read_only=True)
        # Get Class
        cls_row = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        cls = cls_row[0] if cls_row else 'N/A'
        
        # Get Unique Compounds
        try:
            comp_rows = con.execute("SELECT DISTINCT value1, value2, value3, value4 FROM TyresCompound").fetchall()
            distinct_vals = set()
            for row in comp_rows:
                for v in row:
                    if v is not None:
                        distinct_vals.add(int(v))
            compounds = sorted(list(distinct_vals))
        except:
            compounds = "N/A"
            
        print(f"| {f:<70} | {cls:<12} | {str(compounds):<10} |")
        con.close()
    except Exception as e:
        print(f"| {f:<70} | Error        | {'Err':<10} |")
