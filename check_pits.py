import duckdb
import os
import pandas as pd

data_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
files = [f for f in os.listdir(data_dir) if f.endswith('.duckdb')]
files.sort(key=lambda x: os.path.getsize(os.path.join(data_dir, x)), reverse=True)
db_path = os.path.join(data_dir, files[0])

con = duckdb.connect(db_path, read_only=True)

out_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\pits_result.txt'
try:
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'Inspecting {files[0]}\n')
        df = con.execute('SELECT ts, value FROM "In Pits" ORDER BY ts').df()
        lap_df = con.execute('SELECT rowid, ts FROM Lap ORDER BY ts').df()
        
        stints = []
        stint = 1
        for i in range(len(lap_df)):
            start_ts = lap_df.iloc[i]['ts']
            end_ts = lap_df.iloc[i+1]['ts'] if i + 1 < len(lap_df) else float('inf')
            
            # Find pit events in this lap
            l_df = df[(df['ts'] >= start_ts) & (df['ts'] < end_ts)]
            
            in_pit = any(v > 0.5 for v in l_df['value'].values)
            if in_pit: 
                f.write(f'Lap {i} had In Pits = 1. Transitioning to stint {stint + 1}\n')
                stint += 1
                
        f.write(f'\nTotal Stints Detected: {stint}')
except Exception as e:
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'Error: {str(e)}')
finally:
    con.close()
