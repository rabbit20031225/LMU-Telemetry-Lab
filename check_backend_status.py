
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def check_backend():
    print(f"Checking {BASE_URL}...")
    
    # Check Health (if exists) or just sessions
    try:
        resp = requests.get("http://localhost:8000/health")
        print(f"Health Check: {resp.status_code}")
        print(resp.json())
    except Exception as e:
        print(f"Health Check Failed: {e}")

    # Check Sessions
    try:
        resp = requests.get(f"{BASE_URL}/sessions")
        print(f"GET /sessions: {resp.status_code}")
        if resp.status_code == 200:
            print(json.dumps(resp.json(), indent=2))
        else:
            print(resp.text)
    except Exception as e:
        print(f"GET /sessions Failed: {e}")

if __name__ == "__main__":
    check_backend()
