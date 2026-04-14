import pandas as pd
import numpy as np

def solve_drag():
    df = pd.read_csv('elevation_verification_monza.csv')
    v = df['Speed_ms'].values
    # Filter for high speed part where drag is significant (>200 km/h)
    mask = v > (200/3.6)
    
    v_high = v[mask]
    g_high = df['GLong_Smooth'].values[mask]
    
    dt = np.median(np.diff(df['Time']))
    a_real = np.gradient(v, dt)[mask]
    
    # Drag Term Estimation: (G*9.81 - A) = K * V^2
    y = (g_high * 9.81) - a_real
    x = v_high**2
    
    # Linear regression through origin
    K = np.sum(x * y) / np.sum(x**2)
    print(f"Estimated Drag Coefficient K: {K:.8f}")
    
    # Check fit quality (r-squared)
    y_pred = K * x
    ss_res = np.sum((y - y_pred)**2)
    ss_tot = np.sum((y - np.mean(y))**2)
    print(f"Fit R-squared: {1 - (ss_res / ss_tot):.4f}")

if __name__ == "__main__":
    solve_drag()
