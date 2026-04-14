import duckdb
import pandas as pd
import numpy as np

def check_sync():
    DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
    con = duckdb.connect(DB_PATH, read_only=True)
    
    # 50Hz Brake
    b_df = con.execute('SELECT value FROM "Brake Pos"').df()
    b = b_df['value'].values
    
    # 100Hz Speed
    v_df = con.execute('SELECT value FROM "Ground Speed"').df()
    v = v_df['value'].values / 3.6
    
    # Rationalize to 50Hz
    # Every 2nd speed sample matches 1 brake sample?
    v_50hz = v[::2][:len(b)]
    b_50hz = b[:len(v_50hz)]
    
    # Deceleration signal
    a_sig = np.zeros_like(v_50hz)
    a_sig[1:] = (v_50hz[1:] - v_50hz[:-1]) / 0.02
    
    # Cross-correlate: Brake peak (positive) vs Decel (negative)
    corr = np.correlate(b_50hz - np.mean(b_50hz), a_sig - np.mean(a_sig), mode='same')
    lags = np.arange(-len(corr)//2, len(corr)//2)
    
    best_idx = np.argmin(corr)
    best_lag = lags[best_idx]
    
    print(f"Best Brake-Speed Lag: {best_lag} samples at 50Hz ({best_lag*0.02:.2f}s)")
    print(f"Correlation at lag: {corr[best_idx] / (np.std(b_50hz)*np.std(a_sig)*len(b_50hz)):.4f}")
    
    con.close()

if __name__ == "__main__":
    check_sync()
