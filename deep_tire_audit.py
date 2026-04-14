import duckdb
import os

d = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = sorted([f for f in os.listdir(d) if f.endswith('.duckdb')])

print(f"{'File':<60} | {'Class':<10} | {'Unique Values':<20} | {'First 5 Rows'}")
print("-" * 120)

for f in files:
    try:
        path = os.path.join(d, f)
        con = duckdb.connect(path, read_only=True)
        cls_row = con.execute("SELECT value FROM metadata WHERE key='CarClass'").fetchone()
        cls = cls_row[0] if cls_row else "N/A"
        
        # Only interested in the ones user mentioned or similar
        if 'LMP' in cls or 'LMH' in cls or 'HY' in cls.upper() or 'GTP' in cls.upper():
            try:
                # Check for table existence
                tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
                if 'TyresCompound' in tables:
                    res = con.execute("SELECT DISTINCT value1, value2, value3, value4 FROM TyresCompound").fetchall()
                    unique = sorted(list(set(int(x) for r in res for x in r if x is not None)))
                    
                    samples = con.execute("SELECT value1, value2, value3, value4 FROM TyresCompound LIMIT 5").fetchall()
                    print(f"{f:<60} | {cls:<10} | {str(unique):<20} | {samples}")
                else:
                    print(f"{f:<60} | {cls:<10} | MISSING TABLE     |")
            except Exception as e:
                print(f"{f:<60} | {cls:<10} | ERROR: {str(e)[:15]:<10} |")
        con.close()
    except:
        pass
