import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.utils.track_db import find_track_in_registry

test_cases = [
    "Algarve International Circuit",
    "Circuit de la Sarthe",
    "Le Mans",
    "Monza",
    "Autodromo Nazionale Monza",
    "Spa",
    "Circuit of the Americas",
    "Austin",
    "Le Castellet",
    "Sakhir",
    "Portimao",
    "Algarve"
]

print(f"{'Input Name':<40} | {'Matched Key':<20} | {'Result'}")
print("-" * 80)

for name in test_cases:
    key, data = find_track_in_registry(name)
    result = "PASS" if key else "FAIL"
    print(f"{name:<40} | {str(key):<20} | {result}")
