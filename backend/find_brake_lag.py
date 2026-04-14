import duckdb
import pandas as pd
import numpy as np

def find_brake_g_lag():
    DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
    con = duckdb.connect(DB_PATH, read_only=True)
    
    # 50Hz Brake
    b_df = con.execute('SELECT value FROM "Brake Pos"').df()
    b = b_df['value'].values
    
    # 10Hz G
    g_df = con.execute('SELECT value FROM "G Force Long"').df()
    g = g_df['value'].values
    
    # Rationalize to 10Hz for comparison
    # Every 5th brake sample matches 1 G sample?
    b_10hz = b[::5][:len(g)]
    g_10hz = g[:len(b_10hz)]
    
    # Cross-correlate
    # Brake spike (positive) -> G-Long dip (negative)
    # We expect negative correlation
    corr = np.correlate(b_10hz - np.mean(b_10hz), g_10hz - np.mean(g_10hz), mode='same')
    lags = np.arange(-len(corr)//2, len(corr)//2)
    
    # We look for the most negative peak
    best_idx = np.argmin(corr)
    best_lag = lags[best_idx]
    
    print(f"Best Brake-G Lag: {best_lag} samples at 10Hz ({best_lag*0.1:.2f}s)")
    print(f"Correlation at lag: {corr[best_idx] / (np.std(b_10hz)*np.std(g_10hz)*len(b_10hz)):.4f}")
    
    con.close()

if __name__ == "__main__":
    find_brake_g_lag()
