import os
import duckdb
import pandas as pd

db_path = r"C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb"

con = duckdb.connect(db_path, read_only=True)
try:
    print("--- 掃描 4900s 以後的 Lap 頻道與 In Pits 頻道 ---")
    # 讀取最後 100 筆導航數據
    raw_df = con.execute("""
        SELECT ts, value 
        FROM \"Lap\" 
        WHERE ts > 4900 
        ORDER BY ts
    """).df()
    print("Lap 事件表 (ts > 4900):")
    print(raw_df)
    
    pits_df = con.execute("""
        SELECT ts, value 
        FROM \"In Pits\" 
        WHERE ts > 4900 
        ORDER BY ts
    """).df()
    print("\nIn Pits 頻道 (ts > 4900):")
    print(pits_df)
    
    # 直接檢查最後的 Lap 通道數據（不是事件，是連續數據）
    # 假設 Lap 是個連續頻道，如果沒有這個表，則換個方式
    try:
        last_laps = con.execute("SELECT value FROM \"Lap\" ORDER BY ts DESC LIMIT 10").df()
        print("\n最後 10 筆 Lap 數值:")
        print(last_laps)
    except:
        pass

finally:
    con.close()
