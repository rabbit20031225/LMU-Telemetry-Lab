import duckdb

# Path to the duckdb file
db_path = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Sebring International Raceway_R_2026-02-05T08_36_44Z.duckdb'

try:
    con = duckdb.connect(db_path)
    
    tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
    skip_tables = ['GPS Time', 'metadata', 'channelsList', 'eventsList', 'Session Info']
    
    continuous_data = [] # Aligned with GPS Time
    event_data = []      # Added by Timestamp
    
    for table in tables:
        if table in skip_tables:
            continue
            
        col_names = [c[0] for c in con.execute(f"DESCRIBE \"{table}\"").fetchall()]
        
        if 'ts' in col_names:
            event_data.append(table)
        else:
            continuous_data.append(table)
            
    with open('data_sources.txt', 'w', encoding='utf-8') as f:
        f.write("=== 原本和 GPS Time 對齊的數據 (Continuous / 100Hz 延伸) ===\n")
        f.write(f"數量: {len(continuous_data)}\n")
        f.write(", ".join(sorted(continuous_data)) + "\n")
        
        f.write("\n=== 根據時間戳記 (ts) 加上去的數據 (Event / High Precision) ===\n")
        f.write(f"數量: {len(event_data)}\n")
        f.write(", ".join(sorted(event_data)) + "\n")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'con' in locals():
        con.close()
