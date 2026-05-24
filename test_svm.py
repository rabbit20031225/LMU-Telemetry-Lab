import duckdb
import json
import glob
import os

files = glob.glob('DuckDB_data/*.duckdb')
if not files:
    print("No duckdb files found")
    exit()

f = files[-1]  # Pick the latest file
print(f"Reading {f}")
with duckdb.connect(f, read_only=True) as con:
    row = con.execute("SELECT value FROM metadata WHERE key = 'CarSetup'").fetchone()

if row:
    setup_data = json.loads(row[0])
    
    # Let's look for specific keys like FuelSetting
    keys_to_check = ['VM_FUEL_LEVEL', 'VM_REV_LIMITER', 'WM_CAMBER-W_FL', 'VM_ENGINE_MIXTURE']
    for k in keys_to_check:
        print(f"\n{k}: {setup_data.get(k)}")
        
    print("\nAll Keys:")
    # Print out all the keys that are available
    for k, v in setup_data.items():
        if isinstance(v, dict) and v.get('available'):
            print(f"{k} = {v.get('currentSetting')}//{v.get('stringValue')}")
