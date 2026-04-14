import pandas as pd
import numpy as np

def analyze():
    df = pd.read_csv('elevation_verification_monza.csv')
    # Check correlation between Elevation_Raw and other channels
    # But wait! Elevation is an integral, so we check ΔElevation (dh)
    
    v = df['Speed_ms'].values
    g = df['GLong_Smooth'].values
    # We need a_real for this DF
    dt = np.median(np.diff(df['Time']))
    a_real = np.gradient(v, dt)
    
    # Error in acceleration (systematic bias)
    err_a = (g * 9.81) - a_real
    
    # Correlation of error with Speed
    corr_v = np.corrcoef(err_a, v)[0,1]
    # Correlation of error with deceleration (Braking)
    corr_g = np.corrcoef(err_a, g)[0,1]
    
    print(f"Error correlation with Speed: {corr_v:.4f}")
    print(f"Error correlation with GLong: {corr_g:.4f}")
    
    # Check if there is a massive bias
    mean_err = np.mean(err_a)
    print(f"Mean Acceleration Error (Bias): {mean_err:.6f} m/s^2")
    
    # What bias would result in 650m?
    # Mean_Err * Total_Dist / (9.81 * Mean_Speed) ? No.
    # Total_H = Sum( dh ) = Sum( delta_dist * error / 9.81 )
    # 650 = Total_Dist * Mean_Error / 9.81
    # Mean_Error = 650 * 9.81 / 5800 = 1.1 m/s^2
    
    print(f"Required bias for 650m error: {650*9.81/5800:.4f} m/s^2")

if __name__ == "__main__":
    analyze()
