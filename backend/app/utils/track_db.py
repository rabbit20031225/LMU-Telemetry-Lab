import difflib

def find_track_in_registry(search_name: str):
    """
    Finds a track in the registry using exact match, alias match, or fuzzy match.
    Returns (track_key, track_data) or (None, None).
    """
    if not search_name:
        return None, None

    # 1. Normalization
    def normalize(s):
        import re
        import unicodedata
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
    # Gather all searchable names (keys + aliases)
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

TRACK_REGISTRY = {
    "Bahrain": {
        "aliases": ["Sakhir"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish" },
                    { "dist": 450, "alt": 7.0, "corner": "T1 Braking (Downhill)" },
                    { "dist": 600, "alt": 8.5, "corner": "T2 Exit" },
                    { "dist": 850, "alt": 12.5, "corner": "T3 Apex (Climb)" },
                    { "dist": 1150, "alt": 17.5, "corner": "T4 Approach" },
                    { "dist": 1400, "alt": 21.2, "corner": "T4 Apex (Summit)" },
                    { "dist": 1650, "alt": 18.0, "corner": "T5 (Descend Start)" },
                    { "dist": 1850, "alt": 14.5, "corner": "T6/T7 Esses (Continuing Downhill)" },
                    { "dist": 2050, "alt": 11.5, "corner": "T8 Hairpin (Descending)" },
                    { "dist": 2250, "alt": 10.2, "corner": "Straight to T9 (Lowering)" },
                    { "dist": 2400, "alt": 9.5, "corner": "T9 Braking (Lowest point of this sector)" },
                    { "dist": 2550, "alt": 8.8, "corner": "T10 Apex (下坡鎖死區 - 全場次低點)" },
                    { "dist": 2750, "alt": 14.0, "corner": "Back Straight Start (Begin Steep Climb)" },
                    { "dist": 3100, "alt": 22.8, "corner": "T11 Apex (Second Summit)" },
                    { "dist": 3500, "alt": 19.5, "corner": "T12 (Slight Downhill)" },
                    { "dist": 3900, "alt": 17.0, "corner": "T13 High Speed" },
                    { "dist": 4500, "alt": 11.5, "corner": "T14 Heavy Braking" },
                    { "dist": 4850, "alt": 10.5, "corner": "T15 Exit" },
                    { "dist": 5412, "alt": 10.0, "corner": "Start/Finish" }
                ]
            },
            "Endurance": {
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish Line" },
                    { "dist": 450, "alt": 6.8, "corner": "T1 Apex" },
                    { "dist": 1400, "alt": 21.2, "corner": "T4 Apex (進入 Endurance 段)" },
                    { "dist": 1650, "alt": 19.0, "corner": "Endurance T5 (下坡)" },
                    { "dist": 1850, "alt": 17.5, "corner": "Endurance T6/T7" },
                    { "dist": 2100, "alt": 18.8, "corner": "Endurance T8 (回爬)" },
                    { "dist": 2350, "alt": 20.2, "corner": "Endurance T10 (高點)" },
                    { "dist": 2650, "alt": 18.5, "corner": "Re-joining GP Track (原本的 T5)" },
                    { "dist": 2850, "alt": 16.0, "corner": "T6 GP" },
                    { "dist": 3200, "alt": 12.2, "corner": "T8 Hairpin (Low Point)" },
                    { "dist": 3600, "alt": 16.2, "corner": "T10 Apex" },
                    { "dist": 3950, "alt": 22.5, "corner": "T11 (Highest Point)" },
                    { "dist": 5250, "alt": 11.5, "corner": "T14 Braking" },
                    { "dist": 6299, "alt": 10.0, "corner": "Start/Finish Line" }
                ]
            },
            "Outer": {
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish Line" },
                    { "dist": 250, "alt": 9.2, "corner": "T1 Braking" },
                    { "dist": 450, "alt": 6.8, "corner": "T1 Apex (Low)" },
                    { "dist": 1100, "alt": 16.5, "corner": "T4 Approach" },
                    { "dist": 1400, "alt": 21.2, "corner": "T4 Apex (High Point)" },
                    { "dist": 1550, "alt": 19.5, "corner": "Outer Link Entry (開始切徑)" },
                    { "dist": 1750, "alt": 20.8, "corner": "Outer Link Crest (小緩坡)" },
                    { "dist": 2000, "alt": 17.5, "corner": "Re-joining Back Straight (匯入後直道)" },
                    { "dist": 2400, "alt": 16.2, "corner": "T13 High Speed" },
                    { "dist": 2800, "alt": 12.0, "corner": "T14 Braking" },
                    { "dist": 3100, "alt": 10.8, "corner": "T15 Exit" },
                    { "dist": 3543, "alt": 10.0, "corner": "Start/Finish Line" }
                ]
            },
            "Paddock": {
                "ref_points": [
                    { "dist": 0, "alt": 10.0, "corner": "Start/Finish Line" },
                    { "dist": 1400, "alt": 21.2, "corner": "T4 Apex" },
                    { "dist": 1650, "alt": 19.0, "corner": "Entering Paddock Link" },
                    { "dist": 1950, "alt": 15.5, "corner": "Paddock Link Mid (下坡)" },
                    { "dist": 2300, "alt": 12.0, "corner": "Re-joining GP T14" },
                    { "dist": 2700, "alt": 10.8, "corner": "T15 Exit" },
                    { "dist": 3823, "alt": 10.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Circuit de La Sarthe - Le Mans": {
        "aliases": ["Le Mans", "Circuit de la Sarthe", "Sarthe"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 51.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 62.0, "corner": "Dunlop Curve Entry" },
                    { "dist": 650, "alt": 74.5, "corner": "Dunlop Bridge (Highest Point)" },
                    { "dist": 850, "alt": 68.0, "corner": "Dunlop Chicane Exit" },
                    { "dist": 1350, "alt": 61.5, "corner": "Tertre Rouge Entry" },
                    { "dist": 1600, "alt": 59.0, "corner": "Mulsanne Straight Start" },
                    { "dist": 3500, "alt": 55.0, "corner": "First Sector Mid" },
                    { "dist": 4250, "alt": 53.5, "corner": "Chicane 1 Braking" },
                    { "dist": 4450, "alt": 53.0, "corner": "Chicane 1 (Daytona)" },
                    { "dist": 5500, "alt": 51.5, "corner": "Second Sector Mid" },
                    { "dist": 6650, "alt": 49.0, "corner": "Chicane 2 Braking" },
                    { "dist": 6850, "alt": 48.5, "corner": "Chicane 2 (Michelin)" },
                    { "dist": 8000, "alt": 46.0, "corner": "Approaching Mulsanne Corner" },
                    { "dist": 9150, "alt": 38.5, "corner": "Mulsanne Corner Braking" },
                    { "dist": 9300, "alt": 37.0, "corner": "Mulsanne Corner (Lowest Point)" },
                    { "dist": 10600, "alt": 42.5, "corner": "Indianapolis" },
                    { "dist": 11100, "alt": 42.0, "corner": "Arnage" },
                    { "dist": 11800, "alt": 45.0, "corner": "Porsche Curves Entry (Start Climb)" },
                    { "dist": 12100, "alt": 48.5, "corner": "Virage du Pont" },
                    { "dist": 12400, "alt": 52.0, "corner": "Virage S" },
                    { "dist": 12700, "alt": 54.5, "corner": "Maison Blanche" },
                    { "dist": 13200, "alt": 53.0, "corner": "Ford Chicane 1" },
                    { "dist": 13450, "alt": 51.5, "corner": "Ford Chicane 2" },
                    { "dist": 13626, "alt": 51.0, "corner": "Start/Finish Line" }
                ]
            },
            "Mulsanne Circuit (no chicanes)": {
                "ref_points": [
                    { "dist": 0, "alt": 51.0, "corner": "Start/Finish Line" },
                    { "dist": 250, "alt": 52.5, "corner": "Dunlop Curve Entry" },
                    { "dist": 450, "alt": 65.0, "corner": "Dunlop Curve Climb" },
                    { "dist": 650, "alt": 74.5, "corner": "Dunlop Bridge (Highest Point)" },
                    { "dist": 850, "alt": 68.0, "corner": "Dunlop Chicane Exit" },
                    { "dist": 1100, "alt": 64.0, "corner": "Forest Esses" },
                    { "dist": 1350, "alt": 61.5, "corner": "Tertre Rouge Entry" },
                    { "dist": 1600, "alt": 59.0, "corner": "Tertre Rouge Exit (Start of Mulsanne)" },
                    { "dist": 2500, "alt": 56.5, "corner": "Mulsanne Straight - Sector 1" },
                    { "dist": 3500, "alt": 55.0, "corner": "Mulsanne Straight - First Kink (Mild Descent)" },
                    { "dist": 4500, "alt": 53.5, "corner": "Mulsanne Straight - Sector 2" },
                    { "dist": 5500, "alt": 52.0, "corner": "Mulsanne Straight - Sector 3" },
                    { "dist": 6500, "alt": 50.5, "corner": "Mulsanne Straight - Approaching Kink" },
                    { "dist": 7500, "alt": 49.0, "corner": "Mulsanne Kink Area (Crest)" },
                    { "dist": 8300, "alt": 44.5, "corner": "Mulsanne Kink Apex (High Speed Drop)" },
                    { "dist": 8800, "alt": 42.0, "corner": "Descent to Mulsanne Corner" },
                    { "dist": 9100, "alt": 38.5, "corner": "Mulsanne Corner Braking (Heavy G)" },
                    { "dist": 9200, "alt": 37.0, "corner": "Mulsanne Corner (Lowest Point)" },
                    { "dist": 10500, "alt": 42.5, "corner": "Indianapolis" },
                    { "dist": 11000, "alt": 42.0, "corner": "Arnage" },
                    { "dist": 11700, "alt": 45.0, "corner": "Porsche Curves Entry" },
                    { "dist": 12100, "alt": 51.0, "corner": "Porsche Curves Bridge" },
                    { "dist": 12500, "alt": 54.0, "corner": "Corvette Corner" },
                    { "dist": 13000, "alt": 53.5, "corner": "Maison Blanche" },
                    { "dist": 13350, "alt": 51.5, "corner": "Ford Chicanes" },
                    { "dist": 13528, "alt": 51.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Circuit Paul Ricard": {
        "aliases": ["Le Castellet"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 438.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 435.0, "corner": "T1 (Verrerie) - 微幅下坡" },
                    { "dist": 1100, "alt": 439.0, "corner": "T3/T4 (Hotel)" },
                    { "dist": 1800, "alt": 442.0, "corner": "Mistral Straight Entry (爬升至最高點附近)" },
                    { "dist": 2800, "alt": 444.0, "corner": "Mistral Straight Mid (全場最高點)" },
                    { "dist": 3300, "alt": 436.0, "corner": "North Chicane Braking (下坡煞車)" },
                    { "dist": 4100, "alt": 432.0, "corner": "Signes (最快的高速右彎 - 最低點)" },
                    { "dist": 4600, "alt": 434.0, "corner": "Double Droite du Beausset" },
                    { "dist": 5200, "alt": 437.0, "corner": "Bendor / Village" },
                    { "dist": 5770, "alt": 438.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "COTA": {
        "aliases": ["Circuit of the Americas", "Austin"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 131.0, "corner": "Start of Lap (Post-T20)" },
                    { "dist": 200, "alt": 132.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 135.0, "corner": "Begin Massive Climb" },
                    { "dist": 650, "alt": 155.0, "corner": "T1 Apex (Highest Point)" },
                    { "dist": 1000, "alt": 142.0, "corner": "T2 (Downhill Start)" },
                    { "dist": 1600, "alt": 130.0, "corner": "T5 (S-Curves Low)" },
                    { "dist": 2200, "alt": 135.0, "corner": "T9 (Slight Climb)" },
                    { "dist": 2500, "alt": 128.0, "corner": "T11 Hairpin" },
                    { "dist": 3200, "alt": 122.0, "corner": "Back Straight Mid (Lowest Point)" },
                    { "dist": 3700, "alt": 127.0, "corner": "T12 Braking" },
                    { "dist": 4600, "alt": 130.0, "corner": "T16-T18 Carousel" },
                    { "dist": 5100, "alt": 131.5, "corner": "T19" },
                    { "dist": 5400, "alt": 131.0, "corner": "T20 Entry" },
                    { "dist": 5514, "alt": 131.0, "corner": "Lap End" }
                ]
            },
            "National Circuit": {
                "ref_points": [
                    { "dist": 0, "alt": 131.0, "corner": "Start of Lap (Post-T20)" },
                    { "dist": 200, "alt": 132.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 135.5, "corner": "Begin Steep Climb" },
                    { "dist": 650, "alt": 155.0, "corner": "T1 Apex (Highest Point)" },
                    { "dist": 1000, "alt": 140.5, "corner": "T2-T3 Descent" },
                    { "dist": 1400, "alt": 132.0, "corner": "T5 Apex" },
                    { "dist": 1700, "alt": 130.2, "corner": "T6 (National Link Entry)" },
                    { "dist": 1950, "alt": 128.8, "corner": "National Link Mid (Lowest Point)" },
                    { "dist": 2200, "alt": 129.5, "corner": "Re-joining Stadium Section" },
                    { "dist": 2700, "alt": 130.5, "corner": "T16-T18 Carousel" },
                    { "dist": 3300, "alt": 131.5, "corner": "T20 Apex" },
                    { "dist": 3701, "alt": 131.0, "corner": "Lap End" }
                ]
            }
        }
    },
    "Fuji": {
        "aliases": ["Fuji Speedway"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 582.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 575.0, "corner": "T1 (First Corner)" },
                    { "dist": 1100, "alt": 560.0, "corner": "Coca-Cola Corner (最低點)" },
                    { "dist": 1600, "alt": 568.0, "corner": "100R (持續爬升)" },
                    { "dist": 2200, "alt": 585.0, "corner": "Advan Hairpin (T6)" },
                    { "dist": 2500, "alt": 588.0, "corner": "300R" },
                    { "dist": 2850, "alt": 592.5, "corner": "Dunlop Chicane (T10)" },
                    { "dist": 3100, "alt": 598.0, "corner": "T11 / T12" },
                    { "dist": 3500, "alt": 606.0, "corner": "T13 (全場最高點)" },
                    { "dist": 3800, "alt": 602.0, "corner": "T15" },
                    { "dist": 4250, "alt": 594.0, "corner": "Panasonic Corner (T16)" },
                    { "dist": 4563, "alt": 582.0, "corner": "Start/Finish Line" }
                ]
            },
            "Classic Circuit": {
                "ref_points": [
                    { "dist": 0, "alt": 582.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 575.0, "corner": "T1" },
                    { "dist": 1100, "alt": 560.0, "corner": "Coca-Cola Corner" },
                    { "dist": 2200, "alt": 585.0, "corner": "Hairpin" },
                    { "dist": 2800, "alt": 592.0, "corner": "Approach to Classic Sector 3" },
                    { "dist": 3100, "alt": 597.5, "corner": "High Speed Link Entry" },
                    { "dist": 3400, "alt": 604.0, "corner": "Link Section Crest (最高點)" },
                    { "dist": 3800, "alt": 601.5, "corner": "Sweep into Final Straight" },
                    { "dist": 4200, "alt": 593.0, "corner": "Final Turn Exit" },
                    { "dist": 4520, "alt": 582.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Imola": {
        "aliases": ["Autodromo Internazionale Enzo e Dino Ferrari"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 42.0, "corner": "Start/Finish Line" },
                    { "dist": 350, "alt": 40.5, "corner": "Variante del Tamburello Entry" },
                    { "dist": 600, "alt": 38.5, "corner": "Tamburello Exit (最低點 1)" },
                    { "dist": 1100, "alt": 42.0, "corner": "Variante Villeneuve" },
                    { "dist": 1450, "alt": 48.0, "corner": "Tosa Braking (開始劇烈爬升)" },
                    { "dist": 1700, "alt": 58.5, "corner": "Tosa Apex" },
                    { "dist": 1950, "alt": 65.0, "corner": "Piratella Approach (持續爬坡)" },
                    { "dist": 2200, "alt": 72.5, "corner": "Piratella Apex (全場最高點)" },
                    { "dist": 2450, "alt": 62.0, "corner": "Acque Minerali Descent (急下坡)" },
                    { "dist": 2700, "alt": 54.0, "corner": "Acque Minerali First Apex (最低點 2)" },
                    { "dist": 2900, "alt": 58.0, "corner": "Acque Minerali Second Apex (回爬)" },
                    { "dist": 3450, "alt": 69.5, "corner": "Variante Alta (山脊減速彎)" },
                    { "dist": 3900, "alt": 58.0, "corner": "Rivazza Entry (下坡開始)" },
                    { "dist": 4250, "alt": 46.5, "corner": "Rivazza 1 (陡降煞車區)" },
                    { "dist": 4500, "alt": 43.5, "corner": "Rivazza 2" },
                    { "dist": 4909, "alt": 42.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Interlagos": {
        "aliases": ["Jose Carlos Pace", "Sao Paulo", "Autódromo José Carlos Pace", "Autodromo Jose Carlos Pace"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 780.0, "corner": "Start/Finish Line" },
                    { "dist": 250, "alt": 776.0, "corner": "Senna S Entry (開始下墜)" },
                    { "dist": 450, "alt": 752.0, "corner": "Senna S Exit (陡降段)" },
                    { "dist": 1200, "alt": 741.0, "corner": "Curva do Sol" },
                    { "dist": 1500, "alt": 738.5, "corner": "Reta Oposta (平整段)" },
                    { "dist": 1850, "alt": 735.0, "corner": "Descida do Lago (全場最低點)" },
                    { "dist": 2200, "alt": 739.0, "corner": "Ferradura (開始進入技術區爬升)" },
                    { "dist": 2550, "alt": 746.5, "corner": "Laranjinha" },
                    { "dist": 2900, "alt": 743.0, "corner": "Pinheirinho (微幅下壓)" },
                    { "dist": 3250, "alt": 752.5, "corner": "Bico de Pato (再次爬升)" },
                    { "dist": 3550, "alt": 750.0, "corner": "Mergulho (最後的小谷底)" },
                    { "dist": 3800, "alt": 768.5, "corner": "Junção (關鍵爬坡起點)" },
                    { "dist": 4100, "alt": 776.5, "corner": "Subida dos Boxes (全油門爬坡)" },
                    { "dist": 4314, "alt": 780.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Lusail (Qatar)": {
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 11.0, "corner": "Start/Finish" },
                    { "dist": 450, "alt": 10.3, "corner": "T1 Apex" },
                    { "dist": 900, "alt": 10.8, "corner": "T2/T3" },
                    { "dist": 1250, "alt": 11.6, "corner": "T4/T5" },
                    { "dist": 1800, "alt": 11.1, "corner": "T6 Hairpin" },
                    { "dist": 2250, "alt": 10.7, "corner": "T7-T9" },
                    { "dist": 2700, "alt": 11.5, "corner": "T10" },
                    { "dist": 3150, "alt": 12.6, "corner": "T11 Apex (Highest)" },
                    { "dist": 3600, "alt": 11.8, "corner": "T12" },
                    { "dist": 4100, "alt": 11.2, "corner": "T14" },
                    { "dist": 4700, "alt": 10.5, "corner": "T16 Apex" },
                    { "dist": 5100, "alt": 10.8, "corner": "T16 Exit" },
                    { "dist": 5380, "alt": 11.0, "corner": "Start/Finish" }
                ]
            },
            "Short Circuit": {
                "ref_points": [
                    { "dist": 0, "alt": 11.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 10.3, "corner": "T1 Apex (下坡煞車)" },
                    { "dist": 900, "alt": 10.8, "corner": "T2/T3" },
                    { "dist": 1250, "alt": 11.6, "corner": "T4 Apex (爬升開始)" },
                    { "dist": 1400, "alt": 11.8, "corner": "T5 (進入 Short Link 分叉點)" },
                    { "dist": 1650, "alt": 12.3, "corner": "Short Link Mid (小緩坡頂點)" },
                    { "dist": 1900, "alt": 11.5, "corner": "Short Link Exit (下坡匯入)" },
                    { "dist": 2150, "alt": 10.8, "corner": "Re-joining T15 Entry" },
                    { "dist": 2500, "alt": 10.5, "corner": "T16 Apex (全場最低點)" },
                    { "dist": 3100, "alt": 10.8, "corner": "T16 Exit / Main Straight" },
                    { "dist": 3822, "alt": 11.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Monza": {
        "aliases": ["Autodromo Nazionale Monza"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 183.0, "corner": "Start/Finish" },
                    { "dist": 400, "alt": 182.6, "corner": "T1 Braking" },
                    { "dist": 650, "alt": 182.2, "corner": "Variante del Rettifilo" },
                    { "dist": 1100, "alt": 183.1, "corner": "Curva Grande Entry" },
                    { "dist": 1450, "alt": 183.8, "corner": "Curva Grande Mid" },
                    { "dist": 1850, "alt": 184.5, "corner": "T4 Braking" },
                    { "dist": 2150, "alt": 185.2, "corner": "Variante della Roggia" },
                    { "dist": 2450, "alt": 183.5, "corner": "Lesmo 1 Entry" },
                    { "dist": 2650, "alt": 182.8, "corner": "Lesmo 1 Apex" },
                    { "dist": 2850, "alt": 181.5, "corner": "Lesmo 2 Apex (Low Point)" },
                    { "dist": 3300, "alt": 183.0, "corner": "Serraglio Straight" },
                    { "dist": 3800, "alt": 184.8, "corner": "Variante Ascari Braking" },
                    { "dist": 4150, "alt": 186.2, "corner": "Ascari Apex (High Point)" },
                    { "dist": 4600, "alt": 185.0, "corner": "Back Straight" },
                    { "dist": 5100, "alt": 184.2, "corner": "Parabolica Entry" },
                    { "dist": 5400, "alt": 183.5, "corner": "Parabolica Apex" },
                    { "dist": 5793, "alt": 183.0, "corner": "Start/Finish" }
                ]
            },
            "Curva Grande Circuit": {
                "ref_points": [
                    { "dist": 0, "alt": 183.0, "corner": "Start/Finish Line" },
                    { "dist": 400, "alt": 182.8, "corner": "High Speed Approach (原本的 T1 煞車區)" },
                    { "dist": 650, "alt": 182.4, "corner": "Flat-out through T1/T2 Zone" },
                    { "dist": 1000, "alt": 183.2, "corner": "Curva Grande Entry" },
                    { "dist": 1400, "alt": 183.8, "corner": "Curva Grande Apex (微爬升)" },
                    { "dist": 1800, "alt": 184.6, "corner": "Variante della Roggia Braking" },
                    { "dist": 2100, "alt": 185.2, "corner": "T4/T5 Apex" },
                    { "dist": 2400, "alt": 183.5, "corner": "Lesmo 1 Entry" },
                    { "dist": 2800, "alt": 181.5, "corner": "Lesmo 2 Apex (全場最低點)" },
                    { "dist": 3450, "alt": 184.2, "corner": "Serraglio Straight (過橋底)" },
                    { "dist": 4150, "alt": 186.2, "corner": "Variante Ascari Apex (全場最高點)" },
                    { "dist": 4600, "alt": 185.1, "corner": "Back Straight" },
                    { "dist": 5100, "alt": 184.3, "corner": "Parabolica Entry" },
                    { "dist": 5400, "alt": 183.5, "corner": "Parabolica Apex" },
                    { "dist": 5770, "alt": 183.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Portimao": {
        "aliases": ["Algarve International Circuit", "Algarve"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 125.0, "corner": "Start/Finish" },
                    { "dist": 300, "alt": 126.5, "corner": "T1 Braking (Crest)" },
                    { "dist": 550, "alt": 118.0, "corner": "T1/T2 Descent" },
                    { "dist": 850, "alt": 110.5, "corner": "T3 Hairpin (Bottom)" },
                    { "dist": 1050, "alt": 118.0, "corner": "T4 Apex" },
                    { "dist": 1250, "alt": 129.5, "corner": "T5 Hairpin (Climb)" },
                    { "dist": 1500, "alt": 136.0, "corner": "T6" },
                    { "dist": 1850, "alt": 146.5, "corner": "T8 Apex (Summit)" },
                    { "dist": 2100, "alt": 128.0, "corner": "T9 Drop" },
                    { "dist": 2350, "alt": 114.5, "corner": "T11 Descent" },
                    { "dist": 2600, "alt": 111.0, "corner": "T12 (Low Point)" },
                    { "dist": 2900, "alt": 115.5, "corner": "T13" },
                    { "dist": 3300, "alt": 118.0, "corner": "T14 Entry" },
                    { "dist": 3600, "alt": 122.5, "corner": "T15 Entry (Crest)" },
                    { "dist": 4000, "alt": 128.0, "corner": "Galp Apex (Downhill)" },
                    { "dist": 4653, "alt": 125.0, "corner": "Start/Finish" }
                ]
            }
        }
    },
    "Sebring": {
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 18.0, "corner": "Start/Finish" },
                    { "dist": 350, "alt": 17.4, "corner": "T1 Apex" },
                    { "dist": 800, "alt": 18.5, "corner": "T3" },
                    { "dist": 1400, "alt": 19.2, "corner": "T5" },
                    { "dist": 1850, "alt": 19.8, "corner": "T7 Hairpin" },
                    { "dist": 2500, "alt": 19.0, "corner": "Fangio" },
                    { "dist": 3200, "alt": 18.5, "corner": "Cunningham" },
                    { "dist": 3800, "alt": 18.2, "corner": "T13 Tower" },
                    { "dist": 4500, "alt": 17.8, "corner": "T15" },
                    { "dist": 5000, "alt": 17.2, "corner": "T16" },
                    { "dist": 5500, "alt": 16.5, "corner": "T17 Sunset (Lowest)" },
                    { "dist": 5800, "alt": 17.5, "corner": "T17 Exit" },
                    { "dist": 6019, "alt": 18.0, "corner": "Start/Finish" }
                ]
            },
            "School Circuit": {
                "ref_points": [
                    { "dist": 0, "alt": 18.0, "corner": "Start/Finish Line" },
                    { "dist": 350, "alt": 17.4, "corner": "T1 Apex" },
                    { "dist": 1000, "alt": 18.8, "corner": "T4" },
                    { "dist": 1450, "alt": 19.5, "corner": "Entering School Link (T7 前切出)" },
                    { "dist": 1700, "alt": 19.2, "corner": "School Link Mid Section" },
                    { "dist": 2000, "alt": 18.6, "corner": "Re-joining T14 (Conway)" },
                    { "dist": 2350, "alt": 17.8, "corner": "T15" },
                    { "dist": 2750, "alt": 16.6, "corner": "T17 Sunset Bend (Lowest Point)" },
                    { "dist": 3050, "alt": 17.6, "corner": "T17 Exit" },
                    { "dist": 3218, "alt": 18.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Silverstone": {
        "aliases": ["Silverstone Circuit"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 150.0, "corner": "Start/Finish" },
                    { "dist": 450, "alt": 149.2, "corner": "Abbey/Farm" },
                    { "dist": 850, "alt": 148.2, "corner": "The Loop (Lowest)" },
                    { "dist": 1200, "alt": 149.5, "corner": "Aintree" },
                    { "dist": 1800, "alt": 151.8, "corner": "Wellington Straight" },
                    { "dist": 2200, "alt": 153.2, "corner": "Brooklands/Luffield" },
                    { "dist": 2600, "alt": 154.5, "corner": "Woodcote" },
                    { "dist": 2900, "alt": 155.8, "corner": "Copse (Highest)" },
                    { "dist": 3300, "alt": 154.0, "corner": "Maggots" },
                    { "dist": 3600, "alt": 152.5, "corner": "Becketts" },
                    { "dist": 3900, "alt": 151.2, "corner": "Chapel" },
                    { "dist": 4400, "alt": 150.5, "corner": "Hangar Straight" },
                    { "dist": 5100, "alt": 152.8, "corner": "Stowe Apex" },
                    { "dist": 5500, "alt": 151.5, "corner": "Vale/Club" },
                    { "dist": 5891, "alt": 150.0, "corner": "Start/Finish" }
                ]
            }
        }
    },
    "Spa-Francorchamps": {
        "aliases": ["Spa"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 410.0, "corner": "Start/Finish Line (F1 Pits)" },
                    { "dist": 250, "alt": 412.5, "corner": "La Source (Turn 1)" },
                    { "dist": 450, "alt": 390.0, "corner": "Endurance Pits Exit (下坡開始)" },
                    { "dist": 700, "alt": 358.0, "corner": "Eau Rouge (全場最低點)" },
                    { "dist": 800, "alt": 375.0, "corner": "Raidillon Compression (急陡坡)" },
                    { "dist": 950, "alt": 398.0, "corner": "Raidillon Crest (盲彎坡頂)" },
                    { "dist": 1400, "alt": 440.0, "corner": "Kemmel Straight (持續爬升)" },
                    { "dist": 1850, "alt": 468.0, "corner": "Les Combes Braking (全場最高點)" },
                    { "dist": 2100, "alt": 460.0, "corner": "Malmedy" },
                    { "dist": 2550, "alt": 445.0, "corner": "Bruxelles (Rivage - 下坡髮夾彎)" },
                    { "dist": 2900, "alt": 425.0, "corner": "Speaker's Corner (No Name)" },
                    { "dist": 3400, "alt": 395.0, "corner": "Pouhon Entry (Double Gauche)" },
                    { "dist": 3800, "alt": 388.0, "corner": "Pouhon Exit" },
                    { "dist": 4350, "alt": 390.0, "corner": "Fagnes (Campus)" },
                    { "dist": 4850, "alt": 375.0, "corner": "Stavelot Corner" },
                    { "dist": 5250, "alt": 370.0, "corner": "Courbe Paul Frère" },
                    { "dist": 5800, "alt": 385.0, "corner": "Blanchimont 1 (微上坡高速彎)" },
                    { "dist": 6250, "alt": 395.0, "corner": "Blanchimont 2" },
                    { "dist": 6700, "alt": 405.0, "corner": "Bus Stop Braking Zone" },
                    { "dist": 6850, "alt": 408.0, "corner": "Bus Stop Chicane" },
                    { "dist": 7004, "alt": 410.0, "corner": "Start/Finish Line" }
                ]
            }
        }
    },
    "Circuit de Barcelona-Catalunya": {
        "aliases": ["Circuit de Barcelona", "Catalunya"],
        "layouts": {
            "Default": {
                "ref_points": [
                    { "dist": 0, "alt": 145.5, "corner": "Start of Lap (Post-T16)" },
                    { "dist": 400, "alt": 145.2, "corner": "Main Straight Entry" },
                    { "dist": 700, "alt": 147.0, "corner": "T1 Braking Zone (Begin Climb)" },
                    { "dist": 850, "alt": 152.0, "corner": "T1/T2 Apex (Elf - Elevation Peak 1)" },
                    { "dist": 1100, "alt": 154.5, "corner": "T3 (Curvone)" },
                    { "dist": 1350, "alt": 158.5, "corner": "T4 Apex (Repsol - High Point 1)" },
                    { "dist": 1600, "alt": 152.0, "corner": "T5 (Seat - Downhill)" },
                    { "dist": 1900, "alt": 144.5, "corner": "T7/T8 Apex (Low Point 1)" },
                    { "dist": 2300, "alt": 155.0, "corner": "T9 Approach (Steep Climb)" },
                    { "dist": 2550, "alt": 162.0, "corner": "T9 Apex (Campsa - Highest Point)" },
                    { "dist": 2900, "alt": 154.0, "corner": "Back Straight (Descent)" },
                    { "dist": 3300, "alt": 140.0, "corner": "T10 Braking (Lowest Point)" },
                    { "dist": 3650, "alt": 143.5, "corner": "T12 (Banc de Sabadell)" },
                    { "dist": 4100, "alt": 146.0, "corner": "T13 (New Fast Right)" },
                    { "dist": 4450, "alt": 145.8, "corner": "T14-T15 Transition" },
                    { "dist": 4657, "alt": 145.5, "corner": "Lap End / Crossing Line" }
                ]
            }
        }
    }
}
