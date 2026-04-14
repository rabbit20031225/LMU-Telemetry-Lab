import duckdb
DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
con = duckdb.connect(DB_PATH, read_only=True)
print("--- Raw Speed Samples ---")
print(con.execute('SELECT value FROM "Ground Speed" LIMIT 10').df())
print("\n--- Channel metadata ---")
print(con.execute("SELECT * FROM channelsList WHERE channelName='Ground Speed'").df())
con.close()
