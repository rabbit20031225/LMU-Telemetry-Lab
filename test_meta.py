import duckdb
import glob
files = glob.glob('DuckDB_data/*.duckdb')
with duckdb.connect(files[-1], read_only=True) as con:
    meta = con.execute("SELECT key, value FROM metadata LIMIT 50").fetchall()
    for k, v in meta:
        if k != 'CarSetup' and k != 'ChannelNames':
            print(f"{k}: {v[:50]}")
