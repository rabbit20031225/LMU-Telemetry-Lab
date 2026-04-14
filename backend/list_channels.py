import duckdb
import os

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'

def list_channels():
    if not os.path.exists(DB_PATH):
        print(f"DB not found: {DB_PATH}")
        return
    
    con = duckdb.connect(DB_PATH, read_only=True)
    # Get all table names which correspond to channel names
    tables = con.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'").fetchall()
    print("Available Channels:")
    for t in sorted([t[0] for t in tables]):
        print(f"- {t}")
    con.close()

if __name__ == "__main__":
    list_channels()
