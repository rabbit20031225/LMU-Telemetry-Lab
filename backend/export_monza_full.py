import duckdb
import pandas as pd
import os

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
output_csv = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\monza_telemetry_raw_dump.csv'

con = duckdb.connect(db_path)

# List ALL tables
tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
target_tables = ["Path Lateral", "Track Edge", "GPS Time"]

all_data = {}

for tab in target_tables:
    if tab in tables:
        print(f"Reading {tab}...")
        try:
            # Get data with rowid as a fallback index
            df = con.execute(f'SELECT rowid as "RowID", * FROM "{tab}"').df()
            # Prefix columns to avoid collision during merge
            df.columns = [f"{tab}_{c}" if c != 'RowID' else c for c in df.columns]
            all_data[tab] = df
        except Exception as e:
            print(f"Error reading {tab}: {e}")

# Merge on RowID
print("Merging on RowID...")
# We'll use the one with most rows as base? No, just an outer join.
df_final = None
for tab, df in all_data.items():
    if df_final is None:
        df_final = df
    else:
        df_final = pd.merge(df_final, df, on="RowID", how="outer")

print(f"Final shape: {df_final.shape}")
print(f"Saving to {output_csv}...")
df_final.to_csv(output_csv, index=False)

print("Done!")
con.close()
