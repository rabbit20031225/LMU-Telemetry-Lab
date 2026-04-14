import duckdb
import os

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'

def inspect():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found at {DB_PATH}")
        return

    con = duckdb.connect(DB_PATH, read_only=True)
    
    # Lap 2 starts at 425.74s -> index approx 4257
    print("Lap Dist (10Hz) around index 4257 (Lap 2 Start):")
    try:
        df_dist = con.execute('SELECT rowid, value FROM "Lap Dist" LIMIT 40 OFFSET 4247').df()
        print(df_dist)
    except Exception as e:
        print(f"Error: {e}")

    con.close()

if __name__ == "__main__":
    inspect()
