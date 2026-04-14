import duckdb
con = duckdb.connect('backend/telemetry.duckdb', read_only=True)
print(con.execute("SHOW TABLES").df())
con.close()
