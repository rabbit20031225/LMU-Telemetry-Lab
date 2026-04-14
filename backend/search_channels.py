import duckdb
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
con = duckdb.connect(DB_PATH, read_only=True)
res = con.execute("SELECT channelName FROM channelsList").fetchall()
for r in res:
    name = r[0]
    if any(x in name.lower() for x in ['alt', 'z', 'hgt', 'pos']):
        print(name)
con.close()
