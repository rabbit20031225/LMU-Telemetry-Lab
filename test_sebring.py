
import requests

BASE_URL = 'http://localhost:8000/api/v1'

# 1. Get Session ID
sessions = requests.get(f'{BASE_URL}/sessions').json()['sessions']
if sessions:
    print(f"First session keys: {sessions[0].keys()}")
    
sebring = next((s for s in sessions if 'Sebring' in s['id']), None)

if not sebring:
    print("Sebring session not found. Available sessions:")
    for s in sessions:
        print(s)
    exit(1)

print(f"Testing Session: {sebring['id']}")

# 2. Get Telemetry
tel = requests.get(f'{BASE_URL}/sessions/{sebring["id"]}/telemetry').json()
times = tel['Time']
lap_dist = tel['Lap Dist']

# Filter valid Lap Dist
valid_dist = [x for x in lap_dist if x is not None]
if valid_dist:
    print(f"Lap Dist Range (All): {min(valid_dist):.2f} to {max(valid_dist):.2f}")
else:
    print("Lap Dist is all None/Empty")

print(f"Time Range (All): {min(times):.3f} to {max(times):.3f}")

# 3. Get Laps
laps = requests.get(f'{BASE_URL}/sessions/{sebring["id"]}/laps').json()['laps']
print(f"Found {len(laps)} laps.")

for lap in laps[:5]:
    start = lap['startTime']
    end = lap['endTime']
    dur = lap['duration']
    
    # Check data coverage for this lap
    # Find matching indices in telemetry time
    matching_indices = [i for i, t in enumerate(times) if t >= start and t <= end]
    
    if matching_indices:
        lap_dists = [lap_dist[i] for i in matching_indices if lap_dist[i] is not None]
        if lap_dists:
            print(f"Lap {lap['lap']}: Start {start:.2f}, End {end:.2f}, Dur {dur:.2f} -> Dist Range: {min(lap_dists):.2f} to {max(lap_dists):.2f}")
        else:
            print(f"Lap {lap['lap']}: Start {start:.2f}, End {end:.2f} -> No valid distance data.")
    else:
        print(f"Lap {lap['lap']}: Start {start:.2f}, End {end:.2f} -> NO TELEMETRY POINTS FOUND.")
