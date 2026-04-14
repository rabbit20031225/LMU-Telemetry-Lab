filters = ['LMH', 'LMP', 'GTP', 'HYPER']
try:
    with open('audit_results_final.txt', 'r', encoding='utf-16le', errors='ignore') as f:
        content = f.read()
except:
    with open('audit_results_final.txt', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

for line in content.splitlines():
    if '|' in line:
        up_line = line.upper()
        if any(key in up_line for key in filters):
            print(line.strip())
