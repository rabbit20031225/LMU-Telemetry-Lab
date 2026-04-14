import duckdb
import json

db_path = r"C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_P_2026-03-30T05_29_05Z.duckdb"
try:
    con = duckdb.connect(db_path)
    res = con.execute("SELECT value FROM metadata WHERE key = 'CarSetup'").fetchone()
    con.close()
    if res:
        setup = json.loads(res[0])
        result = {
            "VM_FUEL_CAPACITY": setup.get("VM_FUEL_CAPACITY"),
            "VM_FUEL_LEVEL": setup.get("VM_FUEL_LEVEL")
        }
        print(json.dumps(result, indent=4))
    else:
        print("CarSetup key not found")
except Exception as e:
    print(f"Error: {e}")
