import os
import duckdb
import numpy as np
import sys

# Add backend directory to sys.path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.elevation_service import get_3d_track_data

db_path = r"C:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb"

con = duckdb.connect(db_path, read_only=True)
try:
    # 模擬 API 請求：Lap=0, FastestLap=22
    data = get_3d_track_data(con, lap_num=0, fastest_lap_num=22)
    
    rl = data.get("racingLine", [])
    if not rl:
        print("未找到 Racing Line 資料")
        sys.exit(0)

    print(f"Lap 0 總點數: {len(rl)}")
    
    # 檢查座標分佈
    xs = np.array([p['x'] for p in rl])
    ys = np.array([p['y'] for p in rl])
    
    # 計算每一點與起點的距離
    dist_from_start = np.sqrt((xs - xs[0])**2 + (ys - ys[0])**2)
    
    # 找尋是否有巨大的「空白期」或「跳變」
    step_dists = np.sqrt(np.diff(xs)**2 + np.diff(ys)**2)
    jumps = np.where(step_dists > 50)[0] # 超過 50 米的跳躍
    
    if len(jumps) > 0:
        print(f"發現 {len(jumps)} 處坐標跳躍！這說明這圈數據確實分成了兩段或更多段。")
        for j in jumps[:3]:
            print(f"跳躍發生在索引 {j} -> {j+1}, 距離: {step_dists[j]:.2f}m")
    else:
        print("坐標軌跡在地理空間上是連續的一條線。")

finally:
    con.close()
