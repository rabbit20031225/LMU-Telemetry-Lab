import duckdb
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
con = duckdb.connect(DB_PATH, read_only=True)
tables = ['GPS Time', 'Ground Speed', 'G Force Long', 'Lap Dist']
for t in tables:
    count = con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    print(f"{t}: {count}")
con.close()
