import pandas as pd
import numpy as np

def check_correlation():
    df = pd.read_csv('elevation_verification_pitch_corrected.csv')
    
    # G * 9.81 = a_car + a_slope
    # On average, a_slope is small.
    # So G * 9.81 approx a_real
    
    y = df['G_Corrected'].values * 9.81
    x = np.zeros_like(df['Speed_ms'].values)
    dt = np.median(np.diff(df['Time']))
    x[1:] = (df['Speed_ms'].values[1:] - df['Speed_ms'].values[:-1]) / dt
    
    # Filter out start/end artifacts
    mask = (df.index > 10) & (df.index < len(df) - 10)
    x = x[mask]
    y = y[mask]
    
    correlation = np.corrcoef(x, y)[0, 1]
    print(f"Correlation: {correlation:.4f}")
    
    # Linear Fit: y = a*x + b
    # a: scaling factor
    # b: bias (m/s^2)
    coeffs = np.polyfit(x, y, 1)
    print(f"Fit y = {coeffs[0]:.4f}*x + {coeffs[1]:.4f}")
    
    # If coeffs[0] approx 1, then units are correct.
    # If coeffs[1] is significant, it's a systematic bias.

if __name__ == "__main__":
    check_correlation()
