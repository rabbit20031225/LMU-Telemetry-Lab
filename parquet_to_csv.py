import pandas as pd
import os

PARQUET_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.parquet'
CSV_FILE = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\fused_data_1000hz.csv'

try:
    print(f"Reading {PARQUET_FILE}...")
    df = pd.read_parquet(PARQUET_FILE)
    
    print(f"Data shape: {df.shape}")
    print(f"Exporting to {CSV_FILE}...")
    
    # Export to CSV
    df.to_csv(CSV_FILE, index=False)
    
    print("Export complete.")
    
except Exception as e:
    print(f"Error: {e}")
