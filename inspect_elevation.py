import duckdb
import os

db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
con = duckdb.connect(db_path)
res = con.execute("SELECT channelName FROM channelsList").fetchall()
channels = [r[0] for r in res]
elevation_channels = [c for c in channels if any(kw in c.lower() for kw in ['alt', 'height', 'z', 'elevation', 'pos', 'world', 'vert'])]
print("Elevation candidate channels:")
for ec in elevation_channels:
    print(f" - {ec}")
con.close()
