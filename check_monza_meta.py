import duckdb
import json

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_P_2026-02-22T09_02_40Z.duckdb'
con = duckdb.connect(db_path)
res = con.execute("SELECT value FROM metadata WHERE key = 'CarSetup'").fetchone()
if res:
    cs = json.loads(res[0])
    print(json.dumps(cs['VM_STEER_LOCK'], indent=4))
con.close()
