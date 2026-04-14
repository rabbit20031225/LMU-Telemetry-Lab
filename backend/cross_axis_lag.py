import duckdb
import pandas as pd
import numpy as np

def cross_axis():
    DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb'
    con = duckdb.connect(DB_PATH, read_only=True)
    
    # 100Hz Speed
    v_df = con.execute('SELECT value FROM "Ground Speed"').df()
    v = v_df['value'].values / 3.6
    
    # Deceleration signal
    a = np.zeros_like(v)
    a[1:] = (v[1:] - v[:-1]) / 0.01
    
    # G-channels (all at 10Hz)
    def check_channel(name):
        g_df = con.execute(f'SELECT value FROM "{name}"').df()
        g_vals = g_df['value'].values
        # Stretch to matched length via ratio
        ratio = len(v) / len(g_vals)
        g_stretched = np.interp(np.arange(len(v)), np.arange(len(g_vals))*ratio, g_vals)
        
        # Cross-correlate a vs g
        # Reduce size for speed
        step = 10
        a_red = a[::step]
        g_red = g_stretched[::step]
        
        a_red -= np.mean(a_red)
        g_red -= np.mean(g_red)
        
        corr = np.correlate(a_red, g_red, mode='same')
        lags = np.arange(-len(corr)//2, len(corr)//2)
        idx = np.argmax(np.abs(corr))
        
        # Pearson correlation at best lag
        best_lag = lags[idx]
        if best_lag > 0:
            a_sync = a_red[best_lag:]
            g_sync = g_red[:-best_lag]
        elif best_lag < 0:
            a_sync = a_red[:best_lag]
            g_sync = g_red[-best_lag:]
        else:
            a_sync, g_sync = a_red, g_red
            
        final_corr = np.corrcoef(a_sync, g_sync)[0,1]
        return final_corr, best_lag * step * 0.01

    for ch in ['G Force Lat', 'G Force Long', 'G Force Vert']:
        print(f"--- Testing {ch} ---")
        corr, lag_sec = check_channel(ch)
        print(f"Best Correlation: {corr:.4f} at lag {lag_sec:.2f}s")

    con.close()

if __name__ == "__main__":
    cross_axis()
