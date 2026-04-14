import pandas as pd

df = pd.read_csv('fused_data_1000hz.csv', nrows=1)
print("Columns found:")
for col in df.columns:
    print(col)
