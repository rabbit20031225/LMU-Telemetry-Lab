import duckdb
import os
import glob

data_dir = r'c:\Users\rabbit\Desktop\antigravity project\DuckDB_investigation\DuckDB_data'
duckdb_files = glob.glob(os.path.join(data_dir, '*.duckdb'))

for db_path in duckdb_files:
    size = os.path.getsize(db_path)
    if size < 20000:
        continue
    
    print('-' * 30)
    print(f'FILE: {os.path.basename(db_path)}')
    try:
        conn = duckdb.connect(db_path)
        tables = [t[0] for t in conn.execute('SHOW TABLES').fetchall()]
        
        if 'session_metadata' in tables:
            m = conn.execute('SELECT carName FROM session_metadata').fetchone()
            print(f'CAR: {m[0]}')
            
        if 'telemetry' in tables:
            cols = [c[0] for c in conn.execute('DESCRIBE telemetry').fetchall()]
            energy_keywords = ['energy', 'electric', 'mgu', 'battery', 'soc', 'ers', 'hybrid', 'power', 'kw']
            found = [c for c in cols if any(k in c.lower() for k in energy_keywords)]
            print(f'FIELDS: {found}')
            
            for f in found:
                stats = conn.execute(f'SELECT MIN("{f}"), MAX("{f}"), COUNT(DISTINCT "{f}") FROM telemetry').fetchone()
                print(f'  {f}: Min={stats[0]}, Max={stats[1]}, Unique={stats[2]}')
        
        conn.close()
    except Exception as e:
        print(f'ERROR: {e}')