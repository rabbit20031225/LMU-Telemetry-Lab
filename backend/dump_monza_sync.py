import duckdb
import pandas as pd

db_path = '../DuckDB_data/Autodromo Nazionale Monza_P_2026-02-24T15_14_33Z.duckdb'
con = duckdb.connect(db_path)

tables = [t[0] for t in con.execute("SHOW TABLES").fetchall()]

def get_full_data(name):
    try:
        data = con.execute(f"SELECT value FROM \"{name}\"").fetchall()
        return [row[0] for row in data]
    except:
        return []

time = get_full_data("GPS Time")
lat = get_full_data("Path Lateral")
edge = get_full_data("Track Edge")

# Create a combined dataframe for a specific window
df = pd.DataFrame({
    'Row': range(len(time)),
    'Time': time,
    'PathLateral': lat,
    'TrackEdge': edge
})

print("\n--- SYNCHRONIZED DATA (Rows 0-30) ---")
print(df.head(30).to_string(index=False))

print("\n--- METADATA ---")
try:
    meta = con.execute("SELECT * FROM metadata").fetchall()
    for m in meta:
        print(m)
except:
    print("No metadata table")

# Find a section where PathLateral changes
print("\n--- DATA AROUND FIRST MOVEMENT (Rows 500-520) ---")
print(df.iloc[500:520].to_string(index=False))

con.close()
