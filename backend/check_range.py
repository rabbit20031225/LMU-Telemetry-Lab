import pandas as pd
df = pd.read_csv('elevation_verification_monza.csv')
print(f"Elevation Range: {df['Elevation_Corrected'].min():.2f}m to {df['Elevation_Corrected'].max():.2f}m")
print(f"Max Speed: {df['Speed'].max():.2f}")
print(f"Max GLong: {df['GLong'].max():.2f}")
print(f"Min GLong: {df['GLong'].min():.2f}")
