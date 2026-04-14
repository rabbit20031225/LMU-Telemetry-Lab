import pandas as pd
import numpy as np

def find_lap_lag():
    df = pd.read_csv('elevation_verification_pitch_corrected.csv')
    # Use the full Lap 23 data from the CSV
    v = df['Speed_ms'].values
    g = df['GLong_Raw'].values
    dt = np.median(np.diff(df['Time']))
    
    a_real = np.zeros_like(v)
    a_real[1:] = (v[1:] - v[:-1]) / dt
    
    # We search for additional lag on top of what was already applied
    sig1 = a_real / 9.81
    sig2 = g
    
    sig1 -= np.mean(sig1)
    sig2 -= np.mean(sig2)
    
    # Cross-correlation sweep +/- 5 seconds
    search_range = int(5.0 / dt)
    corr = np.correlate(sig1, sig2, mode='same')
    lags = np.arange(-len(corr)//2, len(corr)//2)
    
    idx = np.argmax(np.abs(corr))
    best_lag = lags[idx]
    
    print(f"Additional Lap Lag: {best_lag} samples ({best_lag*dt:.2f}s)")
    print(f"Total Shift would be: {24.45 + best_lag*dt:.2f}s")
    print(f"Max Correlation: {corr[idx] / (np.std(sig1)*np.std(sig2)*len(sig1)):.4f}")

if __name__ == "__main__":
    find_lag()
