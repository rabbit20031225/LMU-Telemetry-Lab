import duckdb
import json
import os
import glob

def get_metadata(db_path):
    try:
        con = duckdb.connect(db_path)
        res = con.execute("SELECT value FROM metadata WHERE key = 'CarSetup'").fetchone()
        con.close()
        if res:
            setup = json.loads(res[0])
            return {
                "VM_FUEL_CAPACITY": setup.get("VM_FUEL_CAPACITY"),
                "VM_FUEL_LEVEL": setup.get("VM_FUEL_LEVEL")
            }
        return "CarSetup not found"
    except Exception as e:
        return f"Error: {e}"

data_dir = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data"
json_file = r"c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\session_metadata.json"

results = {}

if os.path.exists(json_file):
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            setup = data.get("CarSetup", {})
            results["session_metadata.json"] = {
                "VM_FUEL_CAPACITY": setup.get("VM_FUEL_CAPACITY"),
                "VM_FUEL_LEVEL": setup.get("VM_FUEL_LEVEL")
            }
    except Exception as e:
        results["session_metadata.json"] = f"Error: {e}"

for db_file in glob.glob(os.path.join(data_dir, "*.duckdb")):
    name = os.path.basename(db_file)
    results[name] = get_metadata(db_file)

print(json.dumps(results, indent=2))
