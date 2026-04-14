import pandas as pd

FILE_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'

try:
    print(f"Loading {FILE_PATH}...")
    df = pd.read_parquet(FILE_PATH)
    
    print("\n--- First 5 Rows ---")
    print(df[['Time', 'Lap', 'Lap Dist']].head().to_string())
    
    print("\n--- Initial Lap Dist Check ---")
    first_dist = df['Lap Dist'].iloc[0]
    print(f"Start Lap Dist: {first_dist:.4f}")
    
    expected = 4725.01
    if abs(first_dist - expected) < 1.0:
        print("PASS: Initial offset applied correctly.")
    else:
        print(f"FAIL: Expected ~{expected}, got {first_dist}")

except Exception as e:
    print(f"Error: {e}")
