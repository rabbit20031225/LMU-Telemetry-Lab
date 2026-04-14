# Real-world elevation ranges (Max altitude - Min altitude) in meters
TRACK_ELEVATION_METADATA = {
    "monza": 12.8,
    "spa": 102.2,
    "sebring": 2.1,
    "le_mans": 37.3,
    "bahrain": 11.3,
    "fuji": 35.0,
    "imola": 34.0,
    "interlagos": 43.1,
    "portimao": 30.0,
    "cota": 40.9,
    "qatar": 5.0,
    "paul ricard": 12.0,
}

def get_track_range(track_name):
    low_name = track_name.lower()
    for key, val in TRACK_ELEVATION_METADATA.items():
        if key in low_name:
            return val
    return None # Default to no scaling if unknown
