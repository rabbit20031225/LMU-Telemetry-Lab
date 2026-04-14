import pandas as pd

FILE_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'

try:
    print(f"Loading {FILE_PATH}...")
    df = pd.read_parquet(FILE_PATH)
    
    print("\n--- Gear Column Stats ---")
    if 'Gear' in df.columns:
        print(df['Gear'].value_counts().sort_index())
        print(f"\nFirst 10 values:\n{df['Gear'].head(10).tolist()}")
        print(f"Last 10 values:\n{df['Gear'].tail(10).tolist()}")
        
        # Check initial segment
        # First event was at 26.535 (set to 0) or 27.5 (set to 1).
        # My inference: Initial 0.
        # Let's check a sample before 26.5
        sample_time = 10.0
        val_at_10 = df.loc[df['Time'] == sample_time, 'Gear'].values
        if len(val_at_10) > 0:
            print(f"Value at T=10.0s: {val_at_10[0]}")
    else:
        print("FAIL: Gear column not found.")

except Exception as e:
    print(f"Error: {e}")
