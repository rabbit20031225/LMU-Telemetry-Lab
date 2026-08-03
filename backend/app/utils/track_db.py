import re
import difflib
import unicodedata

def find_track_in_registry(search_name: str):
    """
    Finds a track in the registry using exact match, alias match, or fuzzy match.
    Returns (track_key, track_data) or (None, None).
    """
    if not search_name:
        return None, None

    # 1. Normalization
    def normalize(s):
        # Normalize to NFD (decomposed) and filter out non-spacing marks (accents)
        s = "".join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
        s = s.lower().strip()
        # Replace dashes and underscores with spaces
        s = re.sub(r'[-_]', ' ', s)
        # Remove common naming noise (longest matches first)
        s = re.sub(r'\b(circuit de la|circuit de|autodromo nazionale|international|grand prix|circuit|gp|autodromo)\b', '', s)
        return " ".join(s.split())

    norm_search = normalize(search_name)
    
    # 2. Exact Match on Key
    for key in TRACK_REGISTRY:
        if normalize(key) == norm_search:
            return key, TRACK_REGISTRY[key]

    # 3. Alias Match
    for key, data in TRACK_REGISTRY.items():
        aliases = data.get("aliases", [])
        for alias in aliases:
            if normalize(alias) == norm_search:
                return key, data

    # 4. Fuzzy Match
    all_names_map = {} # norm_name -> key
    for key, data in TRACK_REGISTRY.items():
        all_names_map[normalize(key)] = key
        for alias in data.get("aliases", []):
            all_names_map[normalize(alias)] = key
    
    candidates = list(all_names_map.keys())
    matches = difflib.get_close_matches(norm_search, candidates, n=1, cutoff=0.6)
    
    if matches:
        matched_key = all_names_map[matches[0]]
        return matched_key, TRACK_REGISTRY[matched_key]

    return None, None


def find_layout_in_track(track_data, raw_layout: str, raw_track: str = ""):
    """
    Finds layout data within a matched track data using various layout naming forms.
    Returns (layout_name, layout_data) or (None, None).
    """
    if not track_data or not raw_layout:
        return None, None
        
    layouts_dict = track_data.get("layouts", {})
    if not layouts_dict:
        return None, None

    def normalize(s):
        s = "".join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
        s = s.lower().strip()
        s = re.sub(r'[-_]', ' ', s)
        return " ".join(s.split())

    norm_layout = normalize(raw_layout)
    norm_track = normalize(raw_track) if raw_track else ""

    # 1. Exact match on layout key
    for key, data in layouts_dict.items():
        if normalize(key) == norm_layout:
            return key, data

    # 2. Check layout aliases
    for key, data in layouts_dict.items():
        aliases = data.get("aliases", [])
        for alias in aliases:
            if normalize(alias) == norm_layout:
                return key, data

    # 3. Strip track name prefix and match
    stripped_layout = norm_layout
    if norm_track and norm_track in norm_layout:
        stripped_layout = norm_layout.replace(norm_track, "").strip()
        stripped_layout = re.sub(r'^[^a-z0-9]+', '', stripped_layout).strip()

    if stripped_layout:
        for key, data in layouts_dict.items():
            norm_key = normalize(key)
            norm_key_stripped = norm_key.replace("layout", "").strip()
            norm_key_stripped = re.sub(r'^[^a-z0-9]+', '', norm_key_stripped).strip()
            
            if norm_key_stripped == stripped_layout:
                return key, data
                
            aliases = data.get("aliases", [])
            for alias in aliases:
                norm_alias = normalize(alias)
                if norm_alias == stripped_layout:
                    return key, data
                    
        for key, data in layouts_dict.items():
            norm_key = normalize(key)
            norm_key_stripped = norm_key.replace("layout", "").strip()
            norm_key_stripped = re.sub(r'^[^a-z0-9]+', '', norm_key_stripped).strip()
            
            if stripped_layout in norm_key_stripped:
                return key, data
                
            aliases = data.get("aliases", [])
            for alias in aliases:
                norm_alias = normalize(alias)
                if stripped_layout in norm_alias:
                    return key, data

    # 4. Fuzzy containment on keys
    for key, data in layouts_dict.items():
        norm_key = normalize(key)
        if norm_key in norm_layout or norm_layout in norm_key:
            return key, data

    # 5. Default fallback
    default_data = layouts_dict.get("Default")
    if default_data:
        return "Default", default_data
        
    return None, None


TRACK_REGISTRY = {
    "Bahrain International Circuit": {
        "display_name": "Bahrain",
        "aliases": ["Sakhir"],
        "country": "Bahrain",
        "layouts": {
            "Default": {
                "aliases": ["Bahrain International Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish" },
                    { "dist": 450, "alt": 7.0, "corner": "T1 Braking (Downhill)" },
                    { "dist": 600, "alt": 8.5, "corner": "T2 Exit" },
                    { "dist": 740, "alt": 9.5, "corner": "T1 Apex" },
                    { "dist": 830, "alt": 11.0, "corner": "T2 Apex" },
                    { "dist": 960, "alt": 12.5, "corner": "T3 Apex (Climb)" },
                    { "dist": 1150, "alt": 17.5, "corner": "T4 Approach" },
                    { "dist": 1540, "alt": 21.2, "corner": "T4 Apex (Summit 21.2m)" },
                    { "dist": 1790, "alt": 18.0, "corner": "T5 Apex (Descend Start)" },
                    { "dist": 1880, "alt": 16.0, "corner": "T6 Apex" },
                    { "dist": 1995, "alt": 14.5, "corner": "T7 Apex" },
                    { "dist": 2260, "alt": 11.5, "corner": "T8 Hairpin Apex" },
                    { "dist": 2630, "alt": 9.5, "corner": "T9 Apex" },
                    { "dist": 2730, "alt": 8.8, "corner": "T10 Apex (Lowest Point)" },
                    { "dist": 3450, "alt": 22.8, "corner": "T11 Apex (Second Summit)" },
                    { "dist": 3820, "alt": 19.5, "corner": "T12 Apex" },
                    { "dist": 4130, "alt": 17.0, "corner": "T13 Apex" },
                    { "dist": 4930, "alt": 11.5, "corner": "T14 Apex" },
                    { "dist": 5020, "alt": 10.5, "corner": "T15 Apex" },
                    { "dist": 5412, "alt": 10.0, "corner": "Start/Finish" },
                ]
            },
            "Endurance Circuit": {
                "aliases": ["Bahrain Endurance Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish Line" },
                    { "dist": 450, "alt": 6.8, "corner": "T1 Braking" },
                    { "dist": 750, "alt": 8.5, "corner": "T1 Apex" },
                    { "dist": 843, "alt": 10.0, "corner": "T2 Apex" },
                    { "dist": 965, "alt": 12.0, "corner": "T3 Apex" },
                    { "dist": 1540, "alt": 21.2, "corner": "T4 Apex (Endurance Entry)" },
                    { "dist": 1670, "alt": 19.0, "corner": "Endurance T5" },
                    { "dist": 1900, "alt": 17.5, "corner": "Endurance T6" },
                    { "dist": 2040, "alt": 18.0, "corner": "Endurance T7" },
                    { "dist": 2105, "alt": 18.8, "corner": "Endurance T8" },
                    { "dist": 2240, "alt": 20.2, "corner": "Endurance T10 (High Point)" },
                    { "dist": 2650, "alt": 18.5, "corner": "Re-joining GP Track" },
                    { "dist": 3140, "alt": 12.2, "corner": "T8 Hairpin (Low Point)" },
                    { "dist": 3600, "alt": 16.2, "corner": "T10 Apex" },
                    { "dist": 4340, "alt": 22.5, "corner": "T11 Apex (Highest Point)" },
                    { "dist": 5820, "alt": 11.5, "corner": "T14 Apex" },
                    { "dist": 6299, "alt": 10.0, "corner": "Start/Finish Line" },
                ]
            },
            "Outer Circuit": {
                "aliases": ["Bahrain Outer Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish Line" },
                    { "dist": 250, "alt": 9.2, "corner": "T1 Braking" },
                    { "dist": 745, "alt": 8.5, "corner": "T1 Apex" },
                    { "dist": 840, "alt": 10.0, "corner": "T2 Apex" },
                    { "dist": 965, "alt": 12.5, "corner": "T3 Apex" },
                    { "dist": 1540, "alt": 21.2, "corner": "T4 Apex (High Point)" },
                    { "dist": 1670, "alt": 19.5, "corner": "Outer Link Entry" },
                    { "dist": 1900, "alt": 20.8, "corner": "Outer Link Crest" },
                    { "dist": 2300, "alt": 17.5, "corner": "Re-joining Back Straight" },
                    { "dist": 3060, "alt": 12.0, "corner": "T14 Braking" },
                    { "dist": 3150, "alt": 10.8, "corner": "T15 Apex" },
                    { "dist": 3543, "alt": 10.0, "corner": "Start/Finish Line" },
                ]
            },
            "Paddock Circuit": {
                "aliases": ["Bahrain Paddock Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish Line" },
                    { "dist": 725, "alt": 8.5, "corner": "T1 Apex" },
                    { "dist": 810, "alt": 10.0, "corner": "T2 Apex" },
                    { "dist": 920, "alt": 12.0, "corner": "T3 Apex" },
                    { "dist": 980, "alt": 13.5, "corner": "T4 Apex" },
                    { "dist": 1120, "alt": 15.5, "corner": "T5 Apex" },
                    { "dist": 1820, "alt": 21.2, "corner": "Paddock Link Mid" },
                    { "dist": 2460, "alt": 12.0, "corner": "Re-joining GP T14" },
                    { "dist": 3240, "alt": 10.8, "corner": "T15 Apex" },
                    { "dist": 3705, "alt": 10.0, "corner": "Start/Finish Line" },
                ]
            },
        }
    },
    "Circuit de La Sarthe": {
        "display_name": "Le Mans",
        "aliases": ["Le Mans", "Circuit de la Sarthe", "Sarthe"],
        "country": "France",
        "layouts": {
            "Default": {
                "aliases": ["Circuit de la Sarthe"],
                "ref_points": [
                    { "dist": 0, "alt": 55.0, "corner": "Start/Finish Line" },
                    { "dist": 650, "alt": 60.0, "corner": "T1 Apex (Dunlop Curve)" },
                    { "dist": 950, "alt": 79.3, "corner": "Dunlop Chicane Summit (Peak 79.3m)" },
                    { "dist": 1250, "alt": 78.0, "corner": "Dunlop Bridge Crest" },
                    { "dist": 1600, "alt": 68.0, "corner": "Forest Esses" },
                    { "dist": 2100, "alt": 60.0, "corner": "Tertre Rouge Apex" },
                    { "dist": 3500, "alt": 55.0, "corner": "Mulsanne Straight - Sector 1" },
                    { "dist": 4300, "alt": 53.0, "corner": "Daytona Chicane" },
                    { "dist": 5500, "alt": 50.0, "corner": "Mulsanne Straight - Sector 2" },
                    { "dist": 6700, "alt": 48.0, "corner": "Michelin Chicane" },
                    { "dist": 6800, "alt": 42.0, "corner": "Mulsanne Corner (Lowest Point 42m)" },
                    { "dist": 10600, "alt": 52.0, "corner": "Indianapolis Apex" },
                    { "dist": 11100, "alt": 46.0, "corner": "Arnage Apex" },
                    { "dist": 11800, "alt": 50.0, "corner": "Porsche Curves Entry" },
                    { "dist": 12500, "alt": 62.0, "corner": "Porsche Curves Apex" },
                    { "dist": 13200, "alt": 58.0, "corner": "Ford Chicane 1" },
                    { "dist": 13440, "alt": 55.0, "corner": "T38 Apex (Ford Chicane 2)" },
                    { "dist": 13626, "alt": 55.0, "corner": "Start/Finish Line" },
                ]
            },
            "Mulsanne Circuit": {
                "aliases": ["Circuit de la Sarthe Mulsanne"],
                "ref_points": [
                    { "dist": 0, "alt": 55.0, "corner": "Start/Finish Line" },
                    { "dist": 650, "alt": 60.0, "corner": "T1 Apex (Dunlop Curve)" },
                    { "dist": 950, "alt": 79.3, "corner": "Dunlop Chicane Summit" },
                    { "dist": 1600, "alt": 68.0, "corner": "Forest Esses" },
                    { "dist": 2100, "alt": 60.0, "corner": "Tertre Rouge Exit" },
                    { "dist": 5500, "alt": 50.0, "corner": "Full Mulsanne Straight" },
                    { "dist": 9200, "alt": 42.0, "corner": "Mulsanne Corner (Lowest 42m)" },
                    { "dist": 10500, "alt": 52.0, "corner": "Indianapolis" },
                    { "dist": 11000, "alt": 46.0, "corner": "Arnage" },
                    { "dist": 11700, "alt": 50.0, "corner": "Porsche Curves" },
                    { "dist": 13370, "alt": 55.0, "corner": "T32 Apex (Ford Chicane)" },
                    { "dist": 13554, "alt": 55.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Paul Ricard": {
        "display_name": "Paul Ricard",
        "aliases": ["Le Castellet", "Paul Ricard - ELMS"],
        "country": "France",
        "layouts": {
            "Default": {
                "aliases": ["Paul Ricard - ELMS"],
                "ref_points": [
                    { "dist": 0, "alt": 428.0, "corner": "Start/Finish Line" },
                    { "dist": 650, "alt": 426.0, "corner": "T1 Apex (Verrerie Left)" },
                    { "dist": 754, "alt": 426.0, "corner": "T2 Apex (Verrerie Right)" },
                    { "dist": 1330, "alt": 425.0, "corner": "T3 Apex (Sainte-Beaume)" },
                    { "dist": 1400, "alt": 424.0, "corner": "T4 Apex" },
                    { "dist": 1520, "alt": 424.0, "corner": "T5 Apex" },
                    { "dist": 1640, "alt": 425.0, "corner": "T6 Apex" },
                    { "dist": 1880, "alt": 424.0, "corner": "T7 Apex (Hotel)" },
                    { "dist": 2975, "alt": 420.0, "corner": "T8 Apex (Mistral Chicane - Lowest 420m)" },
                    { "dist": 3060, "alt": 420.0, "corner": "T9 Apex" },
                    { "dist": 3950, "alt": 432.0, "corner": "T10 Apex (Signes - Peak 432m)" },
                    { "dist": 4440, "alt": 430.0, "corner": "T11 Apex (Beausset)" },
                    { "dist": 4830, "alt": 427.0, "corner": "T12 Apex (Bendor)" },
                    { "dist": 5075, "alt": 426.0, "corner": "T13 Apex" },
                    { "dist": 5350, "alt": 426.0, "corner": "T14 Apex (Virage du Pont)" },
                    { "dist": 5515, "alt": 427.0, "corner": "T15 Apex" },
                    { "dist": 5842, "alt": 428.0, "corner": "Start/Finish Line" },
                ]
            },
            "Layout 1A": {
                "aliases": ["Paul Ricard - 1A"],
                "ref_points": [
                    { "dist": 0, "alt": 428.0, "corner": "Start/Finish Line" },
                    { "dist": 685, "alt": 426.0, "corner": "T1 Apex" },
                    { "dist": 835, "alt": 425.5, "corner": "T2 Apex" },
                    { "dist": 1290, "alt": 425.0, "corner": "T3 Apex" },
                    { "dist": 1370, "alt": 424.0, "corner": "T4 Apex" },
                    { "dist": 1485, "alt": 424.0, "corner": "T5 Apex" },
                    { "dist": 1615, "alt": 425.0, "corner": "T6 Apex" },
                    { "dist": 1860, "alt": 424.0, "corner": "T7 Apex" },
                    { "dist": 3845, "alt": 432.0, "corner": "T8 Apex (Signes - Peak 432m)" },
                    { "dist": 4350, "alt": 430.0, "corner": "T9 Apex (Beausset)" },
                    { "dist": 4750, "alt": 427.0, "corner": "T10 Apex" },
                    { "dist": 4990, "alt": 426.0, "corner": "T11 Apex" },
                    { "dist": 5260, "alt": 426.0, "corner": "T12 Apex (Virage du Pont)" },
                    { "dist": 5425, "alt": 427.0, "corner": "T13 Apex" },
                    { "dist": 5752, "alt": 428.0, "corner": "Start/Finish Line" },
                ]
            },
            "Layout 1A-V2": {
                "aliases": ["Paul Ricard - 1A-V2"],
                "ref_points": [
                    { "dist": 0, "alt": 428.0, "corner": "Start/Finish Line" },
                    { "dist": 650, "alt": 426.0, "corner": "T1 Apex" },
                    { "dist": 755, "alt": 426.0, "corner": "T2 Apex" },
                    { "dist": 1355, "alt": 425.0, "corner": "T3 Apex" },
                    { "dist": 1410, "alt": 424.0, "corner": "T4 Apex" },
                    { "dist": 1530, "alt": 424.0, "corner": "T5 Apex" },
                    { "dist": 1660, "alt": 425.0, "corner": "T6 Apex" },
                    { "dist": 3100, "alt": 420.0, "corner": "Mistral Chicane (Lowest 420m)" },
                    { "dist": 4200, "alt": 432.0, "corner": "Signes Apex (Peak 432m)" },
                    { "dist": 4800, "alt": 430.0, "corner": "Beausset Apex" },
                    { "dist": 5842, "alt": 428.0, "corner": "Start/Finish Line" },
                ]
            },
            "Layout 1A-V2-Short": {
                "aliases": ["Paul Ricard - 1A-V2-Short"],
                "ref_points": [
                    { "dist": 0, "alt": 428.0, "corner": "Start/Finish Line" },
                    { "dist": 640, "alt": 426.0, "corner": "T1 Apex" },
                    { "dist": 2000, "alt": 425.0, "corner": "Short Link Entry" },
                    { "dist": 3200, "alt": 422.0, "corner": "Short Link Transition" },
                    { "dist": 4200, "alt": 427.0, "corner": "Rejoining Beausset" },
                    { "dist": 5227, "alt": 428.0, "corner": "Start/Finish Line" },
                ]
            },
            "Layout 3A": {
                "aliases": ["Paul Ricard - 3A"],
                "ref_points": [
                    { "dist": 0, "alt": 428.0, "corner": "Start/Finish Line" },
                    { "dist": 515, "alt": 426.5, "corner": "T1 Apex" },
                    { "dist": 650, "alt": 426.0, "corner": "T2 Apex" },
                    { "dist": 2000, "alt": 427.0, "corner": "Short Cut Rejoin" },
                    { "dist": 3793, "alt": 428.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Circuit of the Americas": {
        "display_name": "COTA",
        "aliases": ["COTA", "Austin"],
        "country": "United States",
        "layouts": {
            "Default": {
                "aliases": ["Circuit of the Americas"],
                "ref_points": [
                    { "dist": 0, "alt": 158.0, "corner": "Start/Finish Line" },
                    { "dist": 660, "alt": 189.9, "corner": "T1 Apex (Turn 1 Crest - Peak 189.9m)" },
                    { "dist": 890, "alt": 182.0, "corner": "T2 Apex" },
                    { "dist": 1175, "alt": 172.0, "corner": "T3 Apex (Esses)" },
                    { "dist": 1255, "alt": 166.0, "corner": "T4 Apex" },
                    { "dist": 1350, "alt": 162.0, "corner": "T5 Apex" },
                    { "dist": 1520, "alt": 158.0, "corner": "T6 Apex" },
                    { "dist": 1710, "alt": 156.0, "corner": "T7 Apex" },
                    { "dist": 1880, "alt": 154.0, "corner": "T8 Apex" },
                    { "dist": 1970, "alt": 152.0, "corner": "T9 Apex" },
                    { "dist": 2175, "alt": 150.0, "corner": "T10 Apex" },
                    { "dist": 2575, "alt": 149.0, "corner": "T11 Apex (Hairpin - Lowest 149m)" },
                    { "dist": 3790, "alt": 154.0, "corner": "T12 Apex (Back Straight End)" },
                    { "dist": 4005, "alt": 156.0, "corner": "T13 Apex (Stadium)" },
                    { "dist": 4110, "alt": 157.0, "corner": "T14 Apex" },
                    { "dist": 4300, "alt": 158.0, "corner": "T15 Apex" },
                    { "dist": 4540, "alt": 162.0, "corner": "T16 Apex (Carousel)" },
                    { "dist": 4620, "alt": 161.0, "corner": "T17 Apex" },
                    { "dist": 4720, "alt": 160.0, "corner": "T18 Apex" },
                    { "dist": 5060, "alt": 156.0, "corner": "T19 Apex" },
                    { "dist": 5370, "alt": 158.0, "corner": "T20 Apex (Final Hairpin)" },
                    { "dist": 5513, "alt": 158.0, "corner": "Start/Finish Line" },
                ]
            },
            "National Circuit": {
                "aliases": ["COTA National Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 158.0, "corner": "Start/Finish Line" },
                    { "dist": 660, "alt": 189.9, "corner": "T1 Apex (Peak 189.9m)" },
                    { "dist": 910, "alt": 181.0, "corner": "T2 Apex" },
                    { "dist": 1170, "alt": 172.0, "corner": "T3 Apex" },
                    { "dist": 1260, "alt": 166.0, "corner": "T4 Apex" },
                    { "dist": 1350, "alt": 162.0, "corner": "T5 Apex" },
                    { "dist": 1440, "alt": 158.0, "corner": "T6 Apex" },
                    { "dist": 1530, "alt": 156.0, "corner": "T7 Apex" },
                    { "dist": 1625, "alt": 153.0, "corner": "T8 Apex (National Link)" },
                    { "dist": 1990, "alt": 150.0, "corner": "T9 Apex" },
                    { "dist": 2210, "alt": 152.0, "corner": "T10 Apex" },
                    { "dist": 2300, "alt": 153.0, "corner": "T11 Apex" },
                    { "dist": 2490, "alt": 154.0, "corner": "T12 Apex" },
                    { "dist": 2730, "alt": 157.0, "corner": "T13 Apex" },
                    { "dist": 2800, "alt": 158.0, "corner": "T14 Apex" },
                    { "dist": 2975, "alt": 161.0, "corner": "T15 Apex" },
                    { "dist": 3255, "alt": 156.0, "corner": "T16 Apex" },
                    { "dist": 3550, "alt": 158.0, "corner": "T17 Apex" },
                    { "dist": 3702, "alt": 158.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Fuji Speedway": {
        "display_name": "Fuji",
        "aliases": ["Fuji"],
        "country": "Japan",
        "layouts": {
            "Default": {
                "aliases": ["Fuji Speedway"],
                "ref_points": [
                    { "dist": 0, "alt": 552.0, "corner": "Start/Finish Line" },
                    { "dist": 770, "alt": 550.0, "corner": "T1 Apex (TGR Corner - Lowest 550m)" },
                    { "dist": 930, "alt": 554.0, "corner": "T2 Apex (75R)" },
                    { "dist": 1300, "alt": 558.0, "corner": "T3 Apex (Coca-Cola Corner)" },
                    { "dist": 1600, "alt": 562.0, "corner": "T4/T5 Apex (100R)" },
                    { "dist": 2000, "alt": 566.0, "corner": "T6 Apex (Hairpin Corner)" },
                    { "dist": 2400, "alt": 570.0, "corner": "T7/T8 Apex (300R)" },
                    { "dist": 2800, "alt": 576.0, "corner": "T9/T10 Apex (Dunlop Chicane)" },
                    { "dist": 3100, "alt": 580.0, "corner": "T11/T12 Apex" },
                    { "dist": 3500, "alt": 585.0, "corner": "T13 Apex (Sector 3 Climb - Peak 585m)" },
                    { "dist": 3680, "alt": 578.0, "corner": "T16 Apex (Panasonic Corner)" },
                    { "dist": 4563, "alt": 552.0, "corner": "Start/Finish Line" },
                ]
            },
            "Classic Circuit": {
                "aliases": ["Fuji Speedway Classic"],
                "ref_points": [
                    { "dist": 0, "alt": 552.0, "corner": "Start/Finish Line" },
                    { "dist": 660, "alt": 550.0, "corner": "T1 Apex" },
                    { "dist": 920, "alt": 554.0, "corner": "T2 Apex" },
                    { "dist": 1300, "alt": 558.0, "corner": "Coca-Cola Corner" },
                    { "dist": 2000, "alt": 566.0, "corner": "Hairpin" },
                    { "dist": 2800, "alt": 576.0, "corner": "Classic Sector 3 Approach" },
                    { "dist": 3400, "alt": 585.0, "corner": "Classic Link (Peak 585m)" },
                    { "dist": 3660, "alt": 578.0, "corner": "T14 Apex (Final Corner)" },
                    { "dist": 4526, "alt": 552.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Autodromo Internazionale Enzo e Dino Ferrari": {
        "display_name": "Imola",
        "aliases": ["Imola"],
        "country": "Italy",
        "layouts": {
            "Default": {
                "aliases": ["Autodromo Enzo e Dino Ferrari"],
                "ref_points": [
                    { "dist": 0, "alt": 44.0, "corner": "Start/Finish Line" },
                    { "dist": 310, "alt": 38.0, "corner": "T1 Apex (Tamburello 1 - Lowest 38m)" },
                    { "dist": 690, "alt": 38.5, "corner": "T2 Apex (Tamburello 2)" },
                    { "dist": 750, "alt": 39.0, "corner": "T3 Apex (Tamburello 3)" },
                    { "dist": 890, "alt": 40.0, "corner": "T4 Apex (Villeneuve 1)" },
                    { "dist": 1330, "alt": 46.0, "corner": "T5 Apex (Villeneuve 2)" },
                    { "dist": 1415, "alt": 54.0, "corner": "T6 Apex (Tosa Hairpin - Begin Steep Climb)" },
                    { "dist": 1710, "alt": 72.0, "corner": "T7 Apex (Piratella - Peak 72m)" },
                    { "dist": 2120, "alt": 58.0, "corner": "T8 Apex (Acque Minerali 1)" },
                    { "dist": 2320, "alt": 52.0, "corner": "T9 Apex (Acque Minerali 2)" },
                    { "dist": 2500, "alt": 56.0, "corner": "T10 Apex" },
                    { "dist": 2740, "alt": 60.0, "corner": "T11 Apex" },
                    { "dist": 2850, "alt": 62.0, "corner": "T12 Apex" },
                    { "dist": 2920, "alt": 64.0, "corner": "T13 Apex" },
                    { "dist": 3350, "alt": 66.0, "corner": "T14 Apex (Variante Alta Left)" },
                    { "dist": 3380, "alt": 66.0, "corner": "T15 Apex (Variante Alta Right)" },
                    { "dist": 3700, "alt": 62.0, "corner": "T16 Apex" },
                    { "dist": 3950, "alt": 54.0, "corner": "T17 Apex (Rivazza 1)" },
                    { "dist": 4130, "alt": 46.0, "corner": "T18 Apex (Rivazza 2)" },
                    { "dist": 4260, "alt": 44.5, "corner": "T19 Apex" },
                    { "dist": 4620, "alt": 44.0, "corner": "T20 Apex (Variante Bassa)" },
                    { "dist": 4909, "alt": 44.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Autodromo Jose Carlos Pace": {
        "display_name": "Interlagos",
        "aliases": ["Jose Carlos Pace", "Sao Paulo", "Autódromo José Carlos Pace", "Interlagos"],
        "country": "Brazil",
        "layouts": {
            "Default": {
                "aliases": ["Autódromo José Carlos Pace"],
                "ref_points": [
                    { "dist": 0, "alt": 785.0, "corner": "Start/Finish Line" },
                    { "dist": 380, "alt": 780.0, "corner": "T1 Apex (Senna S Left)" },
                    { "dist": 480, "alt": 768.0, "corner": "T2 Apex (Senna S Right)" },
                    { "dist": 660, "alt": 755.0, "corner": "T3 Apex (Curva do Sol Exit)" },
                    { "dist": 1450, "alt": 745.0, "corner": "T4 Apex (Descida do Lago - Lowest 745m)" },
                    { "dist": 1640, "alt": 748.0, "corner": "T5 Apex" },
                    { "dist": 2080, "alt": 758.0, "corner": "T6 Apex (Ferradura Climb)" },
                    { "dist": 2200, "alt": 762.0, "corner": "T7 Apex" },
                    { "dist": 2380, "alt": 768.0, "corner": "T8 Apex (Laranjinha)" },
                    { "dist": 2500, "alt": 772.0, "corner": "T9 Apex (Pinheirinho)" },
                    { "dist": 2780, "alt": 762.0, "corner": "T10 Apex (Bico de Pato)" },
                    { "dist": 3000, "alt": 755.0, "corner": "T11 Apex (Mergulho)" },
                    { "dist": 3280, "alt": 747.0, "corner": "T12 Apex (Junção - Begin Massive Climb)" },
                    { "dist": 3430, "alt": 755.0, "corner": "T13 Apex (Subida dos Boxes)" },
                    { "dist": 3670, "alt": 772.0, "corner": "T14 Apex (Arquibancadas)" },
                    { "dist": 4060, "alt": 788.1, "corner": "T15 Apex (Pit Straight - Peak 788.1m)" },
                    { "dist": 4309, "alt": 785.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Lusail International Circuit": {
        "display_name": "Lusail",
        "aliases": ["Qatar"],
        "country": "Qatar",
        "layouts": {
            "Default": {
                "aliases": ["Lusail International Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 12.0, "corner": "Start/Finish Line" },
                    { "dist": 800, "alt": 10.3, "corner": "T1 Apex" },
                    { "dist": 1100, "alt": 10.8, "corner": "T2 Apex" },
                    { "dist": 1330, "alt": 11.2, "corner": "T3 Apex" },
                    { "dist": 1730, "alt": 11.6, "corner": "T4 Apex" },
                    { "dist": 1900, "alt": 11.4, "corner": "T5 Apex" },
                    { "dist": 2210, "alt": 11.1, "corner": "T6 Apex (Hairpin)" },
                    { "dist": 2610, "alt": 10.7, "corner": "T7 Apex" },
                    { "dist": 2790, "alt": 11.2, "corner": "T8 Apex" },
                    { "dist": 2940, "alt": 11.5, "corner": "T9 Apex" },
                    { "dist": 3170, "alt": 12.0, "corner": "T10 Apex" },
                    { "dist": 3420, "alt": 12.6, "corner": "T11 Apex (Peak 12.6m)" },
                    { "dist": 3790, "alt": 11.8, "corner": "T12 Apex" },
                    { "dist": 3990, "alt": 11.5, "corner": "T13 Apex" },
                    { "dist": 4190, "alt": 11.2, "corner": "T14 Apex" },
                    { "dist": 4520, "alt": 10.5, "corner": "T15 Apex" },
                    { "dist": 4990, "alt": 10.8, "corner": "T16 Apex" },
                    { "dist": 5400, "alt": 12.0, "corner": "Start/Finish Line" },
                ]
            },
            "Short Circuit": {
                "aliases": ["Lusail Short Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 12.0, "corner": "Start/Finish Line" },
                    { "dist": 810, "alt": 10.3, "corner": "T1 Apex" },
                    { "dist": 1010, "alt": 10.8, "corner": "T2 Apex" },
                    { "dist": 1240, "alt": 11.2, "corner": "T3 Apex" },
                    { "dist": 1300, "alt": 11.6, "corner": "T4 Apex" },
                    { "dist": 1380, "alt": 11.8, "corner": "T5 Apex" },
                    { "dist": 1530, "alt": 12.3, "corner": "T6 Apex (Short Link Peak)" },
                    { "dist": 2070, "alt": 11.5, "corner": "T7 Apex" },
                    { "dist": 2280, "alt": 11.0, "corner": "T8 Apex" },
                    { "dist": 2490, "alt": 10.8, "corner": "T9 Apex" },
                    { "dist": 2800, "alt": 10.5, "corner": "T10 Apex" },
                    { "dist": 3280, "alt": 10.8, "corner": "T11 Apex" },
                    { "dist": 3701, "alt": 12.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Autodromo Nazionale Monza": {
        "display_name": "Monza",
        "aliases": ["Monza"],
        "country": "Italy",
        "layouts": {
            "Default": {
                "aliases": ["Autodromo Nazionale Monza"],
                "ref_points": [
                    { "dist": 0, "alt": 183.0, "corner": "Start/Finish Line" },
                    { "dist": 940, "alt": 178.0, "corner": "T1 Apex (Prima Variante Right - Lowest 178m)" },
                    { "dist": 970, "alt": 178.2, "corner": "T2 Apex (Prima Variante Left)" },
                    { "dist": 1450, "alt": 183.8, "corner": "Curva Grande Apex" },
                    { "dist": 2150, "alt": 185.2, "corner": "Variante della Roggia Apex" },
                    { "dist": 2500, "alt": 188.0, "corner": "Lesmo 1 Apex" },
                    { "dist": 2800, "alt": 190.8, "corner": "Lesmo 2 Apex (Peak 190.8m)" },
                    { "dist": 3300, "alt": 183.0, "corner": "Serraglio Underpass" },
                    { "dist": 4150, "alt": 186.2, "corner": "Variante Ascari Apex" },
                    { "dist": 5130, "alt": 183.5, "corner": "T11 Apex (Curva Parabolica)" },
                    { "dist": 5793, "alt": 183.0, "corner": "Start/Finish Line" },
                ]
            },
            "Curva Grande Circuit": {
                "aliases": ["Monza Curva Grande Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 183.0, "corner": "Start/Finish Line" },
                    { "dist": 1450, "alt": 183.8, "corner": "T1 Apex (Curva Grande)" },
                    { "dist": 2100, "alt": 185.2, "corner": "Roggia Apex" },
                    { "dist": 2800, "alt": 190.8, "corner": "Lesmo 2 Apex (Peak 190.8m)" },
                    { "dist": 4150, "alt": 186.2, "corner": "Ascari Apex" },
                    { "dist": 5170, "alt": 183.5, "corner": "T9 Apex (Parabolica)" },
                    { "dist": 5750, "alt": 183.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Algarve International Circuit": {
        "display_name": "Portimao",
        "aliases": ["Portimao", "Algarve"],
        "country": "Portugal",
        "layouts": {
            "Default": {
                "aliases": ["Algarve International Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 95.0, "corner": "Start/Finish Line" },
                    { "dist": 410, "alt": 85.0, "corner": "T1 Apex (Primeira Blind Drop)" },
                    { "dist": 570, "alt": 92.0, "corner": "T2 Apex (Lagos 1)" },
                    { "dist": 735, "alt": 98.0, "corner": "T3 Apex (Lagos 2)" },
                    { "dist": 870, "alt": 108.0, "corner": "T4 Apex (Climb)" },
                    { "dist": 1460, "alt": 85.0, "corner": "T5 Apex (Tower Hairpin - Lowest 85m)" },
                    { "dist": 1710, "alt": 105.0, "corner": "T6 Apex" },
                    { "dist": 1925, "alt": 110.0, "corner": "T7 Apex" },
                    { "dist": 2080, "alt": 115.0, "corner": "T8 Apex (Rollercoaster Crest - Peak 115m)" },
                    { "dist": 2460, "alt": 92.0, "corner": "T9 Apex (Craig Jones Drop)" },
                    { "dist": 2680, "alt": 108.0, "corner": "T10 Apex (Portimao 1)" },
                    { "dist": 2760, "alt": 110.0, "corner": "T11 Apex (Portimao 2)" },
                    { "dist": 2970, "alt": 114.0, "corner": "T12 Apex" },
                    { "dist": 3200, "alt": 114.0, "corner": "T13 Apex" },
                    { "dist": 3420, "alt": 102.0, "corner": "T14 Apex" },
                    { "dist": 3870, "alt": 95.0, "corner": "T15 Apex (Galp Sweeper)" },
                    { "dist": 4653, "alt": 95.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Sebring International Raceway": {
        "display_name": "Sebring",
        "aliases": ["Sebring"],
        "country": "United States",
        "layouts": {
            "Default": {
                "aliases": ["Sebring International Raceway"],
                "ref_points": [
                    { "dist": 0, "alt": 19.5, "corner": "Start/Finish Line" },
                    { "dist": 530, "alt": 19.0, "corner": "T1 Apex" },
                    { "dist": 2400, "alt": 18.5, "corner": "Hairpin (T7)" },
                    { "dist": 4000, "alt": 20.1, "corner": "Ullmann Straight (Peak 20.1m)" },
                    { "dist": 5570, "alt": 18.0, "corner": "T17 Apex (Sunset Bend - Lowest 18.0m)" },
                    { "dist": 6019, "alt": 19.5, "corner": "Start/Finish Line" },
                ]
            },
            "School Circuit": {
                "aliases": ["Sebring School Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 19.5, "corner": "Start/Finish Line" },
                    { "dist": 505, "alt": 19.0, "corner": "T1 Apex" },
                    { "dist": 1700, "alt": 19.2, "corner": "School Link Mid Section" },
                    { "dist": 2760, "alt": 18.0, "corner": "T7 Apex (Sunset Bend - Lowest 18.0m)" },
                    { "dist": 3219, "alt": 19.5, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Silverstone": {
        "display_name": "Silverstone",
        "aliases": ["Silverstone Circuit"],
        "country": "United Kingdom",
        "layouts": {
            "Default": {
                "aliases": ["Silverstone Grand Prix Circuit - ELMS"],
                "ref_points": [
                    { "dist": 0, "alt": 153.5, "corner": "Start/Finish Line (Hamilton Straight)" },
                    { "dist": 390, "alt": 156.3, "corner": "T1 Apex (Abbey - Peak 156.3m)" },
                    { "dist": 600, "alt": 155.0, "corner": "Farm Curve" },
                    { "dist": 1000, "alt": 147.5, "corner": "Village & The Loop Dip" },
                    { "dist": 1400, "alt": 150.0, "corner": "Aintree" },
                    { "dist": 2200, "alt": 152.0, "corner": "Brooklands" },
                    { "dist": 2500, "alt": 152.0, "corner": "Luffield" },
                    { "dist": 3200, "alt": 155.5, "corner": "Copse Apex" },
                    { "dist": 3800, "alt": 154.0, "corner": "Maggots & Becketts" },
                    { "dist": 4500, "alt": 149.0, "corner": "Hangar Straight" },
                    { "dist": 5000, "alt": 150.5, "corner": "Stowe Corner" },
                    { "dist": 5300, "alt": 145.0, "corner": "Vale Chicane (Lowest Point 145m)" },
                    { "dist": 5600, "alt": 151.0, "corner": "Club Corner" },
                    { "dist": 5890, "alt": 153.5, "corner": "Start/Finish Line" },
                ]
            },
            "International Circuit": {
                "aliases": ["Silverstone International Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 150.0, "corner": "Start/Finish Line" },
                    { "dist": 290, "alt": 156.3, "corner": "T1 Apex (Abbey - Peak 156.3m)" },
                    { "dist": 850, "alt": 148.2, "corner": "The Loop (Lowest 148.2m)" },
                    { "dist": 1900, "alt": 153.5, "corner": "Stowe Rejoin" },
                    { "dist": 2300, "alt": 145.0, "corner": "Vale Chicane" },
                    { "dist": 2979, "alt": 150.0, "corner": "Start/Finish Line" },
                ]
            },
            "National Circuit": {
                "aliases": ["Silverstone National Circuit"],
                "ref_points": [
                    { "dist": 0, "alt": 155.0, "corner": "Start/Finish Line" },
                    { "dist": 380, "alt": 155.8, "corner": "T1 Apex (Copse - Peak 155.8m)" },
                    { "dist": 900, "alt": 152.0, "corner": "National Link" },
                    { "dist": 1400, "alt": 150.5, "corner": "Rejoining Brooklands" },
                    { "dist": 1900, "alt": 153.5, "corner": "Luffield" },
                    { "dist": 2639, "alt": 155.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Circuit de Spa-Francorchamps": {
        "display_name": "Spa",
        "aliases": ["Spa", "Spa-Francorchamps"],
        "country": "Belgium",
        "layouts": {
            "Default": {
                "aliases": ["Circuit de Spa-Francorchamps", "Circuit de Spa-Francorchamps Endurance"],
                "ref_points": [
                    { "dist": 0, "alt": 410.0, "corner": "Start/Finish Line (F1 Pits)" },
                    { "dist": 270, "alt": 412.5, "corner": "T1 Apex (La Source Hairpin)" },
                    { "dist": 600, "alt": 390.0, "corner": "T2 (Endurance Pits Drop)" },
                    { "dist": 930, "alt": 358.0, "corner": "T3 Apex (Eau Rouge Compression - Lowest 358m)" },
                    { "dist": 1020, "alt": 375.0, "corner": "T4 Apex (Raidillon Uphill)" },
                    { "dist": 1160, "alt": 398.0, "corner": "T5 Apex (Raidillon Crest)" },
                    { "dist": 1500, "alt": 440.0, "corner": "T6 (Kemmel Straight Climb)" },
                    { "dist": 2310, "alt": 460.2, "corner": "T7 Apex (Les Combes 1 - Peak 460.2m)" },
                    { "dist": 2390, "alt": 458.0, "corner": "T8 Apex (Les Combes 2)" },
                    { "dist": 2540, "alt": 452.0, "corner": "T9 Apex (Malmedy)" },
                    { "dist": 2950, "alt": 445.0, "corner": "T10 Apex (Bruxelles Hairpin)" },
                    { "dist": 3180, "alt": 425.0, "corner": "T11 Apex (Speaker's Corner)" },
                    { "dist": 3820, "alt": 388.0, "corner": "T12 Apex (Pouhon Double Gauche)" },
                    { "dist": 4400, "alt": 390.0, "corner": "T13 Apex (Fagnes 1)" },
                    { "dist": 4540, "alt": 385.0, "corner": "T14 Apex (Campus)" },
                    { "dist": 4840, "alt": 375.0, "corner": "T15 Apex (Stavelot Corner)" },
                    { "dist": 5070, "alt": 370.0, "corner": "T16 Apex (Courbe Paul Frère)" },
                    { "dist": 5810, "alt": 385.0, "corner": "T17 Apex (Blanchimont 1)" },
                    { "dist": 6090, "alt": 395.0, "corner": "T18 Apex (Blanchimont 2)" },
                    { "dist": 6640, "alt": 405.0, "corner": "T19 Apex (Bus Stop 1)" },
                    { "dist": 6690, "alt": 408.0, "corner": "T20 Apex (Bus Stop 2)" },
                    { "dist": 7004, "alt": 410.0, "corner": "Start/Finish Line" },
                ]
            },
            "Endurance Circuit": {
                "ref_points": [
                    { "dist": 0, "alt": 410.0, "corner": "Start/Finish Line (F1 Pits)" },
                    { "dist": 270, "alt": 412.5, "corner": "T1 Apex (La Source Hairpin)" },
                    { "dist": 600, "alt": 390.0, "corner": "T2 (Endurance Pits Drop)" },
                    { "dist": 930, "alt": 358.0, "corner": "T3 Apex (Eau Rouge Compression - Lowest 358m)" },
                    { "dist": 1020, "alt": 375.0, "corner": "T4 Apex (Raidillon Uphill)" },
                    { "dist": 1160, "alt": 398.0, "corner": "T5 Apex (Raidillon Crest)" },
                    { "dist": 1500, "alt": 440.0, "corner": "T6 (Kemmel Straight Climb)" },
                    { "dist": 2310, "alt": 460.2, "corner": "T7 Apex (Les Combes 1 - Peak 460.2m)" },
                    { "dist": 2390, "alt": 458.0, "corner": "T8 Apex (Les Combes 2)" },
                    { "dist": 2540, "alt": 452.0, "corner": "T9 Apex (Malmedy)" },
                    { "dist": 2950, "alt": 445.0, "corner": "T10 Apex (Bruxelles Hairpin)" },
                    { "dist": 3180, "alt": 425.0, "corner": "T11 Apex (Speaker's Corner)" },
                    { "dist": 3820, "alt": 388.0, "corner": "T12 Apex (Pouhon Double Gauche)" },
                    { "dist": 4400, "alt": 390.0, "corner": "T13 Apex (Fagnes 1)" },
                    { "dist": 4540, "alt": 385.0, "corner": "T14 Apex (Campus)" },
                    { "dist": 4840, "alt": 375.0, "corner": "T15 Apex (Stavelot Corner)" },
                    { "dist": 5070, "alt": 370.0, "corner": "T16 Apex (Courbe Paul Frère)" },
                    { "dist": 5810, "alt": 385.0, "corner": "T17 Apex (Blanchimont 1)" },
                    { "dist": 6090, "alt": 395.0, "corner": "T18 Apex (Blanchimont 2)" },
                    { "dist": 6640, "alt": 405.0, "corner": "T19 Apex (Bus Stop 1)" },
                    { "dist": 6690, "alt": 408.0, "corner": "T20 Apex (Bus Stop 2)" },
                    { "dist": 7004, "alt": 410.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Circuit de Barcelona": {
        "display_name": "Barcelona",
        "aliases": ["Circuit de Barcelona", "Catalunya", "Circuit de Barcelona-Catalunya"],
        "country": "Spain",
        "layouts": {
            "Default": {
                "aliases": ["Circuit de Barcelona"],
                "ref_points": [
                    { "dist": 0, "alt": 145.5, "corner": "Start of Lap (Post-T14)" },
                    { "dist": 400, "alt": 145.2, "corner": "Main Straight Entry" },
                    { "dist": 850, "alt": 152.0, "corner": "T1 Apex (Elf Right)" },
                    { "dist": 950, "alt": 153.0, "corner": "T2 Apex (Elf Left)" },
                    { "dist": 1200, "alt": 154.5, "corner": "T3 Apex (Curvone Long Right)" },
                    { "dist": 1760, "alt": 158.5, "corner": "T4 Apex (Repsol Right)" },
                    { "dist": 2130, "alt": 152.0, "corner": "T5 Apex (Seat Hairpin Downhill)" },
                    { "dist": 2380, "alt": 146.0, "corner": "T6 Apex" },
                    { "dist": 2560, "alt": 144.5, "corner": "T7 Apex" },
                    { "dist": 2640, "alt": 145.0, "corner": "T8 Apex" },
                    { "dist": 2910, "alt": 162.0, "corner": "T9 Apex (Campsa - Peak 162m)" },
                    { "dist": 3500, "alt": 140.0, "corner": "T10 Apex (La Caixa Hairpin - Lowest 140m)" },
                    { "dist": 3610, "alt": 143.5, "corner": "T11 Apex" },
                    { "dist": 3790, "alt": 144.5, "corner": "T12 Apex (Banc de Sabadell)" },
                    { "dist": 4070, "alt": 146.0, "corner": "T13 Apex (New Fast Right)" },
                    { "dist": 4370, "alt": 145.8, "corner": "T14 Apex (Final Right Sweep)" },
                    { "dist": 4657, "alt": 145.5, "corner": "Lap End / Crossing Line" },
                ]
            }
        }
    },
    "WeatherTech Raceway Laguna Seca": {
        "display_name": "Laguna Seca",
        "aliases": ["WeatherTech Raceway Laguna Seca", "Laguna Seca"],
        "country": "United States",
        "layouts": {
            "Default": {
                "aliases": ["WeatherTech Raceway Laguna Seca", "Laguna Seca"],
                "ref_points": [
                    { "dist": 0, "alt": 250.0, "corner": "Start/Finish Line" },
                    { "dist": 240, "alt": 255.0, "corner": "T1 Apex (Andretti Approach)" },
                    { "dist": 700, "alt": 252.0, "corner": "T2 Apex (Andretti Hairpin)" },
                    { "dist": 1100, "alt": 260.0, "corner": "Turn 3 / Turn 4" },
                    { "dist": 1500, "alt": 275.0, "corner": "Turn 5 (Begin Steep Climb)" },
                    { "dist": 1850, "alt": 290.0, "corner": "Turn 6 (Rahal Straight Climb)" },
                    { "dist": 2200, "alt": 305.0, "corner": "Turn 8 (Corkscrew Crest - Peak 305m)" },
                    { "dist": 2350, "alt": 287.0, "corner": "Turn 8A (The Corkscrew Drop - 18m Vertical Drop)" },
                    { "dist": 2600, "alt": 270.0, "corner": "Turn 9 (Rainey Curve)" },
                    { "dist": 3000, "alt": 258.0, "corner": "Turn 10" },
                    { "dist": 3290, "alt": 248.0, "corner": "T11 Apex (Hairpin - Lowest 248m)" },
                    { "dist": 3602, "alt": 250.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    },
    "Daytona International Speedway": {
        "display_name": "Daytona",
        "aliases": ["Daytona International Speedway", "Daytona", "Daytona Road Course"],
        "country": "United States",
        "layouts": {
            "Default": {
                "aliases": ["Daytona International Speedway Road Course", "Daytona Road Course"],
                "ref_points": [
                    { "dist": 0, "alt": 12.0, "corner": "Start/Finish Line (Tri-Oval)" },
                    { "dist": 460, "alt": 11.5, "corner": "T1 Apex (Leave High Banking)" },
                    { "dist": 900, "alt": 3.0, "corner": "T1/T2 Infield (Flat Section - Lowest 3m)" },
                    { "dist": 1400, "alt": 3.0, "corner": "International Horseshoe (T3)" },
                    { "dist": 1900, "alt": 3.0, "corner": "T5 / T6 Kink" },
                    { "dist": 2300, "alt": 12.5, "corner": "Rejoining Oval T1/T2 Banking (Peak 12.5m)" },
                    { "dist": 3200, "alt": 12.5, "corner": "Superstretch (Back Straight)" },
                    { "dist": 4000, "alt": 3.5, "corner": "Bus Stop Chicane (T8-T10)" },
                    { "dist": 4500, "alt": 12.5, "corner": "East Banking (Oval T3/T4)" },
                    { "dist": 5300, "alt": 12.5, "corner": "Tri-Oval High Banking" },
                    { "dist": 5729, "alt": 12.0, "corner": "Start/Finish Line" },
                ]
            }
        }
    }
}
