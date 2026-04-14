import pandas as pd
import numpy as np

def check_speed():
    df = pd.read_csv('elevation_verification_pitch_corrected.csv')
    v_measured = df['Speed_ms'].values
    dist = df['Dist'].values
    dt = np.median(np.diff(df['Time']))
    
    # Calculate speed from distance
    v_derived = np.zeros_like(dist)
    v_derived[1:] = (dist[1:] - dist[:-1]) / dt
    
    # Filter wrap-around points (where dist drops)
    mask = (dist[1:] - dist[:-1]) > -100
    v_derived_clean = v_derived[1:][mask]
    v_measured_clean = v_measured[1:][mask]
    
    correlation = np.corrcoef(v_measured_clean, v_derived_clean)[0, 1]
    print(f"Speed Correlation: {correlation:.4f}")
    
    # Linear Fit
    coeffs = np.polyfit(v_measured_clean, v_derived_clean, 1)
    print(f"Fit v_derived = {coeffs[0]:.4f}*v_measured + {coeffs[1]:.4f}")

if __name__ == "__main__":
    check_speed()
