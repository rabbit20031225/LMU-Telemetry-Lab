import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.utils.track_db import find_track_in_registry, find_layout_in_track

test_cases = [
    # (raw_track, raw_layout, expected_layout_key)
    ("Paul Ricard", "Paul Ricard - ELMS", "Default"),
    ("Paul Ricard", "Paul Ricard - 1A", "Layout 1A"),
    ("Paul Ricard", "Paul Ricard - 1A-V2", "Layout 1A-V2"),
    ("Paul Ricard", "Paul Ricard - 1A-V2-Short", "Layout 1A-V2-Short"),
    ("Paul Ricard", "Paul Ricard - 3A", "Layout 3A"),
    # Test fallback
    ("Paul Ricard", "Some Unknown Layout", "Default"),
    ("Paul Ricard", "Paul Ricard", "Default"),
]

print(f"{'Track':<15} | {'Raw Layout':<30} | {'Expected':<20} | {'Matched Layout':<20} | {'Result'}")
print("-" * 100)

all_passed = True
for track_name, raw_layout, expected in test_cases:
    track_key, track_data = find_track_in_registry(track_name)
    if not track_key:
        print(f"Error matching track: {track_name}")
        all_passed = False
        continue
        
    matched_layout, layout_data = find_layout_in_track(track_data, raw_layout, track_name)
    result = "PASS" if matched_layout == expected else "FAIL"
    if matched_layout != expected:
        all_passed = False
    print(f"{track_name:<15} | {raw_layout:<30} | {expected:<20} | {str(matched_layout):<20} | {result}")

print("-" * 100)
if all_passed:
    print("ALL TESTS PASSED!")
    sys.exit(0)
else:
    print("SOME TESTS FAILED!")
    sys.exit(1)
