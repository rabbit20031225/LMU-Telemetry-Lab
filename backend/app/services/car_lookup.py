import csv
import os
import logging
import difflib
import re

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# 1. Load CSV Mapping (Primary Source)
# ---------------------------------------------------------
CSV_ENTRIES = [] # Full list for iteration
CSV_BY_NUMBER = {} # #Num -> [Entries]

import sys

def get_base_path():
    """Get the base path for resources, handles PyInstaller environment."""
    if getattr(sys, 'frozen', False):
        # Use _MEIPASS for bundled data files
        if hasattr(sys, '_MEIPASS'):
            return sys._MEIPASS
        return os.path.dirname(sys.executable)
    # Service is at backend/app/services/car_lookup.py -> root is 3 levels up
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

BASE_DIR = get_base_path()
CSV_FILENAME = "lmu_carname_to_modelname.csv"

# Potential locations for CSV
possible_paths = [
    os.path.join(BASE_DIR, CSV_FILENAME),
    os.path.join(os.getcwd(), CSV_FILENAME),
]

CSV_PATH = next((p for p in possible_paths if os.path.exists(p)), None)

def extract_number(s):
    if not s: return None
    import re
    match = re.search(r'#(\d+)', s)
    return match.group(1) if match else None

def extract_year(s):
    if not s: return None
    import re
    match = re.search(r'(20\d{2})', s)
    return match.group(1) if match else None

def parse_steer_lock(s):
    """
    Extracts the first sequence of digits from a steering lock string.
    Example: "524deg (18.5deg)" -> 524
    """
    if not s: return None
    import re
    match = re.search(r'(\d+)', str(s))
    return int(match.group(1)) if match else None

def clean_technical_suffixes(s):
    if not s: return ""
    import re
    # Remove technical suffixes starting with colon (e.g., :EC, :LM, :LMDh)
    s = re.sub(r':\w+', '', s)
    return s.strip()

LIVERY_KEYWORDS = ['custom team', 'custom', 'team', 'livery']

MODEL_ALIASES = {
    "911gt3r": ["porsche", "911", "gt3", "r"],
    "499p": ["ferrari", "499p"],
    "gr010": ["toyota", "gr010"],
    "v-series.r": ["cadillac", "v-series.r"],
    "sc63": ["lamborghini", "sc63"],
    "a424": ["alpine", "a424"],
    "v8": ["bmw", "hybrid", "v8"],
    "720s": ["mclaren", "720s"],
    "vantage": ["aston", "vantage"],
    "mustang": ["ford", "mustang"],
    "296": ["ferrari", "296"],
    "huracan": ["lamborghini", "huracan"],
    "rcf": ["lexus", "rcf"],
}

def normalize_custom_car_name(s):
    """Aggressively clean car names for smart matching."""
    s = s.lower()
    for k in LIVERY_KEYWORDS:
        s = s.replace(k, ' ')
    
    # Try to split jammed words like 911GT3R -> 911 GT3 R
    import re
    s = re.sub(r'(\d+)([a-zA-Z]+)', r'\1 \2', s) # 911GT3R -> 911 GT3R
    s = re.sub(r'([a-zA-Z]+)(\d+)', r'\1 \2', s) # GT3R2025 -> GT3R 2025
    
    # Standard separators
    s = s.replace('#', ' ').replace('(', ' ').replace(')', ' ').replace(':', ' ').replace('-', ' ').replace('_', ' ')
    return " ".join(s.split())

if CSV_PATH:
    try:
        with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            # Normalize headers to lowercase for robust lookup
            raw_fieldnames = reader.fieldnames if reader.fieldnames else []
            field_map = {name.lower().strip(): name for name in raw_fieldnames}
            
            # Identify key columns by normalized names
            col_car = field_map.get('carname')
            col_model = field_map.get('modelname')
            col_lock = field_map.get('steeringlock')
            col_cat = field_map.get('category')
            
            for row in reader:
                if not col_car or not col_model: continue
                
                model_name_raw = row[col_model].strip()
                car_name_raw = row[col_car].strip()
                num = extract_number(car_name_raw)
                year = extract_year(car_name_raw)
                
                # Keywords should include BOTH the specific car name and the model name
                all_raw_text = f"{car_name_raw} {model_name_raw}".lower()
                entry_keywords = set(k for k in all_raw_text.replace('#', ' ').replace('(', ' ').replace(')', ' ').replace(':', ' ').replace('-', ' ').replace('_', ' ').split() if k not in LIVERY_KEYWORDS)

                entry = {
                    "carName": car_name_raw,
                    "modelName": model_name_raw,
                    "steeringLock": int(row[col_lock].strip()) if col_lock and row[col_lock].strip() else 540,
                    "category": row[col_cat].strip() if col_cat else "None",
                    "number": num,
                    "year": year,
                    "keywords": entry_keywords
                }
                CSV_ENTRIES.append(entry)
                if num:
                    if num not in CSV_BY_NUMBER:
                        CSV_BY_NUMBER[num] = []
                    CSV_BY_NUMBER[num].append(entry)
                    
        logger.info(f"Loaded {len(CSV_ENTRIES)} car entries from {CSV_FILENAME}.")
    except Exception as e:
        logger.error(f"Error loading car mapping CSV: {e}")
else:
    logger.warning("Car mapping CSV not found.")

# ---------------------------------------------------------
# 2. Brands and Keywords
# ---------------------------------------------------------
BRANDS = [
    'mercedes', 'amg', 'lamborghini', 'ferrari', 'porsche', 'bmw', 'aston', 'toyota', 
    'cadillac', 'peugeot', 'alpine', 'chevrolet', 'corvette', 'mclaren', 'oreca', 
    'ginetta', 'ligier', 'lexus', 'ford', 'mustang', 'isotta', 'glickenhaus', 'vanwall', 'genesis'
]

# ---------------------------------------------------------
# 3. Special Rules (Highest Priority overrides) - Use sparingly
# ---------------------------------------------------------
SPECIAL_RULES = [
  # Add very specific overrides here if needed
]

# ---------------------------------------------------------
# 4. Standard Mapping (Secondary Fallback)
# ---------------------------------------------------------
STANDARD_MAPPING = {
  "united autosports": { "modelName": "McLaren 720S GT3 Evo", "category": "LMGT3", "steeringLock": 540 },
  "manthey": { "modelName": "Porsche 911 GT3 R (992)", "category": "LMGT3", "steeringLock": 540 },
  "iron dames": { "modelName": "Porsche 911 GT3 R (992)", "category": "LMGT3", "steeringLock": 540 },
  "d'station": { "modelName": "Aston Martin Vantage AMR GT3 Evo", "category": "LMGT3", "steeringLock": 540 },
  "tf sport": { "modelName": "Corvette Z06 GT3.R", "category": "LMGT3", "steeringLock": 540 },
  "akkodis": { "modelName": "Lexus RC F GT3", "category": "LMGT3", "steeringLock": 540 },
  "toyota gazoo": { "modelName": "Toyota GR010 Hybrid", "category": "Hypercar", "steeringLock": 480 },
  "porsche penske": { "modelName": "Porsche 963", "category": "Hypercar", "steeringLock": 480 },
  "cadillac": { "modelName": "Cadillac V-Series.R", "category": "Hypercar", "steeringLock": 480 },
  "peugeot": { "modelName": "Peugeot 9X8", "category": "Hypercar", "steeringLock": 480 },
  "alpine endurance": { "modelName": "Alpine A424", "category": "Hypercar", "steeringLock": 480 },
  "oreca": { "modelName": "Oreca 07 Gibson", "category": "LMP2", "steeringLock": 480 },
}

def get_car_info(car_name_meta, car_class_meta=None, override_steer_lock=None):
    """
    Returns (RealName, SteeringLock).
    """
    if override_steer_lock is not None:
        # If explicitly overridden, we still need the RealName but will use the provided lock
        # We can still run the lookup but ignore the lock from CSV
        pass
    # Combine name and class for better keyword/brand detection
    car_name_clean = clean_technical_suffixes(car_name_meta or "")
    full_search_str = f"{car_name_clean} {car_class_meta or ''}".lower()
    clean_str = car_name_clean.lower().strip()
    num = extract_number(clean_str)
    year = extract_year(full_search_str)
    has_custom = any(k in clean_str for k in LIVERY_KEYWORDS)
    
    # Detect brand keywords in either name or class
    telemetry_brands = [b for b in BRANDS if b in full_search_str]
    
    # Improved keyword extraction: remove common punctuation and livery fluff
    clean_search = full_search_str.replace('#', ' ').replace('(', ' ').replace(')', ' ').replace(':', ' ').replace('-', ' ').replace('_', ' ')
    telemetry_keywords = set(k for k in clean_search.split() if k not in LIVERY_KEYWORDS)

    def calculate_score(entry):
        # Base overlap score
        overlap = telemetry_keywords.intersection(entry["keywords"])
        score = len(overlap) * 5 # Base overlap
        
        # Check Number Match (High Reward)
        if num and entry["number"] == num:
            score += 50
        
        # Check Brand Match
        brand_match = False
        brand_mismatch = False
        
        entry_text = (entry["carName"] + " " + entry["modelName"]).lower()
        
        # Add exact carName match bonus
        if clean_str == entry["carName"].lower().strip():
            score += 200
            
        for b in telemetry_brands:
            if b in entry_text:
                brand_match = True
                score += 30 # Significantly boost same brand
            else:
                # If telemetry has a brand but this entry doesn't have it, it's a conflict
                brand_mismatch = True
        
        # If there's a brand mismatch, heavily penalize
        if brand_mismatch and not brand_match and telemetry_brands:
            score -= 60
            
        # Check Year Match (Secondary priority)
        if year:
            if entry["year"] == year:
                score += 5 # Minor bonus for correct year (Tie-breaker)
            # No massive penalty for wrong year if number/team matches

        return score

    # Strategy A: Number-based Match (Highest confidence if score is high)
    # Skip if custom livery, as numbers are unreliable
    if not has_custom and num and num in CSV_BY_NUMBER:
        candidates = CSV_BY_NUMBER[num]
        best_cand = None
        best_score = -500
        
        for cand in candidates:
            score = calculate_score(cand)
            if score > best_score:
                best_score = score
                best_cand = cand
        
        # If we have a good score (matching number + some keywords or brand)
        if best_cand and best_score >= 30: # At least number + 2 keywords or brand
            lock = override_steer_lock if override_steer_lock is not None else best_cand["steeringLock"]
            return best_cand["modelName"], lock

    # Strategy B: Keyword Overlap (Global search)
    # Skip if custom livery, as keywords might be messy
    if not has_custom and len(clean_str) > 3:
        best_cand = None
        best_score = 1 # Minimum threshold
        
        for entry in CSV_ENTRIES:
            score = calculate_score(entry)
            if score > best_score:
                best_score = score
                best_cand = entry
        
        if best_cand and best_score >= 20: # Require at least a brand match + 1 keyword or multiple keywords
            lock = override_steer_lock if override_steer_lock is not None else best_cand["steeringLock"]
            return best_cand["modelName"], lock

    # Strategy C: Legacy Special Rules
    for rule in SPECIAL_RULES:
        contains_list = rule.get("contains", [])
        has_all_keywords = True
        for k in contains_list:
            if k not in clean_str:
                has_all_keywords = False
                break
        
        excludes_list = rule.get("excludes", [])
        has_no_excluded = True
        for k in excludes_list:
            if k in clean_str:
                has_no_excluded = False
                break
                
        if has_all_keywords and has_no_excluded:
             spec = rule["spec"]
             lock = override_steer_lock if override_steer_lock is not None else spec["steeringLock"]
             return spec["modelName"], lock

    # 3. Standard Mapping
    for key, spec in STANDARD_MAPPING.items():
        if key in clean_str:
             lock = override_steer_lock if override_steer_lock is not None else spec["steeringLock"]
             return spec["modelName"], lock

    # ---------------------------------------------------------
    # SMART SEARCH FALLBACK (Phase 3)
    # ---------------------------------------------------------
    has_custom = any(k in clean_str for k in LIVERY_KEYWORDS)
    
    smart_search_str = normalize_custom_car_name(car_name_meta)
    smart_tokens = smart_search_str.split()
    
    # Fuzzy expand tokens: if "mustng" is close to "mustang", add "mustang"
    expanded_keywords = set(smart_tokens)
    for token in smart_tokens:
        if len(token) < 3: continue
        # Try to find close matches in BRANDS or MODEL_ALIASES
        matches = difflib.get_close_matches(token, BRANDS + list(MODEL_ALIASES.keys()), n=1, cutoff=0.7)
        if matches:
            expanded_keywords.add(matches[0])
            if matches[0] in MODEL_ALIASES:
                expanded_keywords.update(MODEL_ALIASES[matches[0]])

    best_cand = None
    best_score = 0
    
    for entry in CSV_ENTRIES:
        score = 0
        entry_text = (entry["carName"] + " " + entry["modelName"]).lower()
        entry_keywords = entry["keywords"]
        
        # 1. Exact or Fuzzy Keyword Match (Higher weight)
        overlap = expanded_keywords.intersection(entry_keywords)
        score += len(overlap) * 20
        
        # 2. Substring matching for model name (Crucial for shortened names)
        for k in expanded_keywords:
            if len(k) > 2 and k in entry_text:
                score += 25
        
        # 3. Brand consistency
        has_entry_brand = any(b in entry_text for b in telemetry_brands)
        if has_entry_brand:
            score += 50
            
        # 4. Number match (Ignore if custom, as numbers are unreliable)
        if not has_custom and num and entry["number"] == num:
            score += 40
            
        # 5. Year tie-breaker
        if year and entry["year"] == year:
            score += 5

        if score > best_score:
            best_score = score
            best_cand = entry
            
    if best_cand and best_score >= 40: # Higher threshold for smart mapping
        lock = override_steer_lock if override_steer_lock is not None else best_cand["steeringLock"]
        return best_cand["modelName"], lock
             
    # 3. ID Cleaning / Generic Fallback
    # If standard mapping failed, maybe it's a raw ID like "mclaren_720s_gt3_evo"
    # value is likely the raw car name.
    
    # Common replacements
    name = clean_str.replace("_", " ").title()
    
    # Specific fixups
    replacements = {
        "Gt3": "GT3",
        "Gte": "GTE",
        "Bmw": "BMW",
        "Amg": "AMG",
        "Lmh": "LMH",
        "Lmdh": "LMDh",
        "F1": "F1"
    }
    for k, v in replacements.items():
        name = name.replace(k, v)
        
    lock = override_steer_lock if override_steer_lock is not None else 540
    return name, lock # Default lock
