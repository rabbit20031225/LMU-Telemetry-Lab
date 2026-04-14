import duckdb
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
con = duckdb.connect(DB_PATH, read_only=True)
tables = ['GPS Time', 'Ground Speed', 'G Force Long', 'Lap Dist', 'FrontRideHeight', 'RearRideHeight']
for t in tables:
    print(f"--- {t} ---")
    try:
        print(con.execute(f'PRAGMA table_info("{t}")').df())
    except:
        print("Table not found or error")
con.close()
