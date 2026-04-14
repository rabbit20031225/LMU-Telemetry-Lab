
import sys
import os
import requests

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

BASE_URL = "http://localhost:8000/api/v1"

def test_telemetry():
    # 1. Get Sessions
    print("Fetching sessions...")
    try:
        resp = requests.get(f"{BASE_URL}/sessions")
        sessions = resp.json()["sessions"]
        if not sessions:
            print("No sessions found.")
            return
        
        session_id = sessions[0]["id"]
        print(f"Testing Session: {session_id}")

        # 2. Get Laps
        print("Fetching laps...")
        resp = requests.get(f"{BASE_URL}/sessions/{session_id}/laps")
        laps = resp.json()["laps"]
        print(f"Found {len(laps)} laps.")

        # 3. Get Telemetry
        print("Fetching telemetry (this might take a moment)...")
        resp = requests.get(f"{BASE_URL}/sessions/{session_id}/telemetry")
        if resp.status_code != 200:
            print(f"Failed to get telemetry: {resp.status_code} {resp.text}")
            return
        
        telemetry = resp.json()
        print("Telemetry keys:", list(telemetry.keys()))
        
        for key, values in telemetry.items():
            if values:
                try:
                    valid_values = [v for v in values if v is not None]
                    if valid_values:
                        min_val = min(valid_values)
                        max_val = max(valid_values)
                        print(f"Channel '{key}': Range {min_val} to {max_val} (Count: {len(values)})")
                    else:
                        print(f"Channel '{key}': All None (Count: {len(values)})")
                except Exception as e:
                    # e.g. for string channels if any
                    print(f"Channel '{key}': Error calculating range - {e}")
            else:
                 print(f"Channel '{key}': Empty")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_telemetry()
