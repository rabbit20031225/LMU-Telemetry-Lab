import duckdb
import numpy as np
import pandas as pd

DB_PATH = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'

def diagnose():
    con = duckdb.connect(DB_PATH, read_only=True)
    df_speed = con.execute('SELECT value FROM "Ground Speed"').df()
    df_g = con.execute('SELECT value FROM "G Force Long"').df()
    con.close()
    
    v = df_speed['value'].values / 3.6
    g = df_g['value'].values
    
    # Take a snippet where speed increases significantly (Acceleration)
    # Turn 1 exit (La Source) is around index 86000-88000
    snippet_start = 86500
    snippet_end = 87500
    
    v_s = v[snippet_start:snippet_end]
    g_s = g[snippet_start:snippet_end] # This might be 10Hz, v is 100Hz
    
    print(f"Speed snippet (first 10): {v_s[:10]}")
    print(f"Speed delta: {v_s[-1] - v_s[0]:.2f} m/s (should be positive for acceleration)")
    
    # Check G values during this period
    # Need to match indices if different rates
    g_upsampled = np.interp(np.linspace(0, len(g)-1, len(v)), np.arange(len(g)), g)
    g_s_up = g_upsampled[snippet_start:snippet_end]
    
    print(f"Mean upsampled G during acceleration: {np.mean(g_s_up):.4f}")
    if np.mean(g_s_up) > 0:
        print("RESULT: G Force Long is POSITIVE for ACCELERATION")
    else:
        print("RESULT: G Force Long is NEGATIVE for ACCELERATION")

if __name__ == "__main__":
    diagnose()
