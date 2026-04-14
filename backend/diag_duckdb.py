import duckdb
import os
import glob
import pandas as pd

DATA_DIR = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = glob.glob(os.path.join(DATA_DIR, '*.duckdb'))

if not files:
    with open('diag_log.txt', 'w', encoding='utf-8') as f:
        f.write("No duckdb files found.")
    exit(1)

con = duckdb.connect(files[0], read_only=True)

with open('diag_log.txt', 'w', encoding='utf-8') as f:
    try:
        f.write("--- SHOW TABLES ---\n")
        tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
        f.write(str(tables) + "\n")

        f.write("\n--- Track Edge info ---\n")
        if "Track Edge" in tables:
            f.write(str(con.execute('DESCRIBE "Track Edge"').fetchall()) + "\n")
            f.write(str(con.execute('SELECT * FROM "Track Edge" LIMIT 20').fetchall()) + "\n")
        else:
            f.write("'Track Edge' table not found.\n")

        f.write("\n--- Searching for 'Center', 'Road', 'Left', 'Right', 'Distance' ---\n")
        relevant_tables = [t for t in tables if any(k in t.lower() for k in ['center', 'road', 'left', 'right', 'pos', 'dist'])]
        f.write(str(relevant_tables) + "\n")

        for rt in relevant_tables:
            f.write(f"\n--- Data for {rt} ---\n")
            try:
                f.write(str(con.execute(f'SELECT * FROM "{rt}" LIMIT 5').fetchall()) + "\n")
            except Exception as e:
                f.write(f"Error reading {rt}: {e}\n")

    finally:
        con.close()
