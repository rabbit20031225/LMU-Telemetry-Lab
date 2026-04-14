import os
import duckdb
import sys
import numpy as np

# Add backend directory to sys.path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.elevation_service import get_3d_track_data

db_path = r"C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb"

con = duckdb.connect(db_path, read_only=True)
try:
    # 模擬 API 請求：Lap=0, FastestLap=22 (剛剛查到的)
    data = get_3d_track_data(con, lap_num=0, fastest_lap_num=22)
    
    racing_line = data.get("racingLine", [])
    print(f"--- Racing Line (Lap 0) 診斷 ---")
    print(f"點數 (Point Count): {len(racing_line)}")
    
    if len(racing_line) > 0:
        # 檢查座標跳變 (使用 x, y 座標)
        xs = np.array([p['x'] for p in racing_line])
        ys = np.array([p['y'] for p in racing_line])
        
        diffs = np.sqrt(np.diff(xs)**2 + np.diff(ys)**2)
        max_jump = np.max(diffs) if len(diffs) > 0 else 0
        print(f"最大座標跳變 (Max Coordinate Jump): {max_jump:.3f}m")
        
        if max_jump > 20.0: # 門檻值 20 米，這對 3D 模型來說算巨大跳轉
            print(f"警告：發現座標巨大跳變 ({max_jump:.2f}m)！這會讓畫面上出現分離的兩段線。")
        else:
            print("座標連續性正常。")
        
        # 檢查是否有重複的時間段
        dists = np.array([p['d'] for p in racing_line])
        if len(dists) > 0:
            backward_jumps = np.where(np.diff(dists) < -10)[0]
            if len(backward_jumps) > 0:
                print(f"警告：發現距離頻道回跳！次數: {len(backward_jumps)}")
                print(f"回跳位置索引: {backward_jumps[:5]}...")
            
finally:
    con.close()
