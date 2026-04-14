import duckdb
import pandas as pd
import numpy as np

DB_SPA = r'C:\Users\rabbit\AppData\Local\LMU_Telemetry_Lab_Dev\Data\guest\DuckDB_data\Circuit de Spa-Francorchamps_R_2026-02-28T04_33_36Z.duckdb'
con = duckdb.connect(DB_SPA, read_only=True)

print("--- Spa Laps ---")
laps_df = con.execute('SELECT ts, value FROM "Lap" ORDER BY ts').df()
print(laps_df)

# Check sync between Speed (100Hz) and G (10Hz)
v_vals = con.execute('SELECT value FROM "Ground Speed"').df()['value'].values / 3.6
g_vals = con.execute('SELECT value FROM "G Force Long"').df()['value'].values

# Stretch G to V length
ratio = len(v_vals) / len(g_vals)
g_stretched = np.interp(np.arange(len(v_vals)), np.arange(len(g_vals))*ratio, g_vals)

# Calc acceleration from speed
dt = 0.01
a_real = np.zeros_like(v_vals)
a_real[1:] = (v_vals[1:] - v_vals[:-1]) / dt

# Cross-correlate to find lag
# Use middle chunk to avoid transients
start, end = len(v_vals)//4, 3*len(v_vals)//4
sig1 = a_real[start:end]
sig2 = g_stretched[start:end]
sig1 -= np.mean(sig1)
sig2 -= np.mean(sig2)

corr = np.correlate(sig1, sig2, mode='same')
lags = np.arange(-len(corr)//2, len(corr)//2)
idx = np.argmax(np.abs(corr))
best_lag_samples = lags[idx]
best_lag_sec = best_lag_samples * dt

print(f"\nDetected Lag for Spa: {best_lag_sec:.2f}s ({best_lag_samples} samples)")
print(f"Max Correlation: {corr[idx] / (np.std(sig1)*np.std(sig2)*len(sig1)):.4f}")

con.close()
