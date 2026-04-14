
import requests

BASE_URL = 'http://localhost:8000/api/v1'

try:
    sessions = requests.get(f'{BASE_URL}/sessions').json().get('sessions', [])
    sebring = next((s for s in sessions if 'Sebring' in s['id']), None)
    
    if not sebring:
        print("Sebring session not found.")
        exit(1)
        
    print(f"Requesting telemetry for: {sebring['id']}")
    resp = requests.get(f'{BASE_URL}/sessions/{sebring["id"]}/telemetry')
    print(f"Status Code: {resp.status_code}")
    print("Response Text Preview:")
    print(resp.text[:500]) # First 500 chars
    
except Exception as e:
    print(f"Script Error: {e}")
