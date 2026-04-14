import duckdb
import os
import json

db_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = [f for f in os.listdir(db_dir) if f.endswith('.duckdb')]

print(f"| {'File':<60} | {'Class':<15} | {'Compounds':<20} |")
print("|" + "-"*62 + "|" + "-"*17 + "|" + "-"*22 + "|")

for f in files:
    path = os.path.join(db_dir, f)
    try:
        con = duckdb.connect(path, read_only=True)
        # Get Class
        cls_row = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        cls = cls_row[0] if cls_row else 'N/A'
        
        # Get Unique Compounds from all 4 wheels
        try:
            comp_rows = con.execute("SELECT DISTINCT value1, value2, value3, value4 FROM TyresCompound").fetchall()
            distinct_vals = set()
            for row in comp_rows:
                for v in row:
                    if v is not None:
                        distinct_vals.add(int(v) if v == int(v) else v)
            compounds = sorted(list(distinct_vals))
        except:
            compounds = "No Table"
            
        print(f"| {f:<60} | {cls:<15} | {str(compounds):<20} |")
        con.close()
    except Exception as e:
        print(f"| {f:<60} | Error          | {str(e)[:18]:<20} |")
