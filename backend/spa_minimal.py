import duckdb
import numpy as np
import csv

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'
OUT_CSV = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\spa_elevation_results.csv'

def smooth(arr, window=50):
    return np.convolve(arr, np.ones(window)/window, mode='same')

def run():
    con = duckdb.connect(DB_PATH, read_only=True)
    
    # Simple fetch
    v = con.execute('SELECT value FROM "Ground Speed"').df()['value'].values / 3.6
    g = con.execute('SELECT value FROM "G Force Long"').df()['value'].values
    d = con.execute('SELECT value FROM "Lap Dist"').df()['value'].values
    t = con.execute('SELECT value FROM "GPS Time"').df()['value'].values
    con.close()
    
    # Match lengths first
    n = len(v)
    g_upsampled = np.interp(np.arange(n), np.linspace(0, n-1, len(g)), g)
    
    # Sync (Fixed -89.27s lag)
    # Corrected Shift logic: Speed leads G by 89s? Or G leads Speed?
    # inspect_spa said Detected Lag: -89.27s.
    # a_real correlates with g_stretched best if shifted.
    # We use the shift tool.
    lag_samples = int(-89.27 / 0.01)
    
    g_aligned = np.zeros_like(g_upsampled)
    if lag_samples > 0:
        g_aligned[lag_samples:] = g_upsampled[:-lag_samples]
    elif lag_samples < 0:
        abs_lag = abs(lag_samples)
        g_aligned[:-abs_lag] = g_upsampled[abs_lag:]
    else: g_aligned = g_upsampled
    
    # Elevation Trend (Simple)
    # dh = dd * (g - a) / 9.81
    # For now, let's just get the raw integration
    # Just grab 1 lap
    l_start, l_end = 85496, 99850 # Index for Lap 5 (approx)
    v_l = v[l_start:l_end]
    g_l = g_aligned[l_start:l_end]
    # a_real = dv/dt
    a_l = np.zeros_like(v_l)
    a_l[1:] = (v_l[1:] - v_l[:-1]) / 0.01
    
    # dh
    dh = (g_l - a_l) / 9.81 * (v_l * 0.01)
    elev = np.cumsum(dh)
    
    # Closure
    elev -= np.linspace(0, elev[-1], len(elev))
    
    # Save via native CSV
    with open(OUT_CSV, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Index', 'Elevation'])
        for i, val in enumerate(elev):
            writer.writerow([i, val])
    
    print(f"Saved to {OUT_CSV}")
    print(f"Range: {np.min(elev):.2f}m to {np.max(elev):.2f}m")

if __name__ == "__main__":
    run()
