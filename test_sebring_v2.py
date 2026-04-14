
import requests
import sys
import bisect

BASE_URL = 'http://localhost:8000/api/v1'

def main():
    # 1. Get Session ID
    try:
        sessions = requests.get(f'{BASE_URL}/sessions').json()['sessions']
        sebring = next((s for s in sessions if 'Sebring' in s['id']), None)
        if not sebring:
            print("Sebring session not found.")
            exit(1)
        print(f"Session: {sebring['id']}")
        
        # 2. Get Telemetry
        tel = requests.get(f'{BASE_URL}/sessions/{sebring["id"]}/telemetry').json()
        times = tel['Time']
        lap_dist = tel['Lap Dist']
        
        # 3. Get Laps
        laps = requests.get(f'{BASE_URL}/sessions/{sebring["id"]}/laps').json()['laps']
        print(f"Laps: {len(laps)}")
        
        # Verification: Consistency Check
        # We expect all full laps (1, 2, 3) to end at the SAME value (Dynamic Ref).
        # We don't know the exact value (it's dynamic), but it should be consistent.
        
        full_laps = [1, 2, 3]
        end_values = []
        
        print("\nChecking Consistency for Full Laps (1, 2, 3):")
        for i, lap in enumerate(laps):
            if i not in full_laps: continue
            
            idx_start = bisect.bisect_left(times, lap['startTime'])
            idx_end = bisect.bisect_right(times, lap['endTime'])
            segment_dists = lap_dist[idx_start:idx_end]
            
            if not segment_dists: continue
            val = segment_dists[-1]
            end_values.append(val)
            print(f"  Lap {i} End: {val:.4f}m")
            
        if not end_values:
            print("No full laps found?")
            exit(1)
            
        import statistics
        mean_val = statistics.mean(end_values)
        stdev = statistics.stdev(end_values) if len(end_values) > 1 else 0
        
        print(f"Mean End Value: {mean_val:.4f}m")
        print(f"Std Dev: {stdev:.6f}")
        
        if stdev < 0.1:
            print("[PASS] Full laps are consistently aligned.")
        else:
            print(f"[FAIL] Full laps are inconsistent! StdDev {stdev:.6f} > 0.1")

    except Exception as e:
        print(f"Error: {e}")
        exit(1)

if __name__ == "__main__":
    main()
