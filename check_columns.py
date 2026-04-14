import pandas as pd

FILE_PATH = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'

try:
    print(f"Loading {FILE_PATH}...")
    df = pd.read_parquet(FILE_PATH)
    
    cols = sorted(list(df.columns))
    print(f"\nTotal Columns: {len(cols)}")
    print(cols)
    
    if 'value' in cols:
        print("\nFAIL: 'value' column still exists.")
    else:
        print("\nPASS: No generic 'value' column found.")

except Exception as e:
    print(f"Error: {e}")
