import requests
import json
import os
from urllib.parse import quote

def test_elevation():
    # Use the session from earlier tests
    session_id = "Autodromo Nazionale Monza_R_2026-03-04T13_18_13Z.duckdb"
    url = f"http://localhost:8000/api/v1/sessions/{quote(session_id)}/3d-track?lap=1&profile_id=guest"
    
    results = {
        "url": url,
        "success": False,
        "error": None,
        "data": {}
    }
    
    try:
        response = requests.get(url)
        results["status_code"] = response.status_code
        if response.status_code != 200:
            results["error"] = response.text
        else:
            data = response.json()
            points = data.get("data", [])
            track_name = data.get("trackName")
            track_layout = data.get("trackLayout")
            
            z_values = [p.get("z", 0) for p in points] if points else []
            z_min = min(z_values) if z_values else 0
            z_max = max(z_values) if z_values else 0
            
            results["success"] = True
            results["data"] = {
                "trackName": track_name,
                "trackLayout": track_layout,
                "pointsCount": len(points),
                "zMin": z_min,
                "zMax": z_max,
                "zRange": z_max - z_min,
                "samplePoints": points[:3] if points else []
            }
            
    except Exception as e:
        results["error"] = str(e)
        
    with open("elevation_diagnostics.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print("Diagnostics saved to elevation_diagnostics.json")

if __name__ == "__main__":
    test_elevation()
