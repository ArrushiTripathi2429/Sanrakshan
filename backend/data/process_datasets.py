"""
Layer 1 — Static Foundation Data Processor
Processes collected datasets and enriches village profiles for Sanrakshan.

Datasets:
- village_amenities.csv     → population, PHC, hospital, road, water data
- ahs-mort-uttar_pradesh-rae_bareli.csv → health/mortality indicators
- UDISE_plus-19-20_enrol_rae_bareli_up.csv → school enrollment
- sbm__uttar_pradesh__rae_bareli.csv → sanitation data

Output: enriched_villages.json → uploaded to Firestore villageProfiles collection
"""

import csv
import json
import os
import re

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")
OUT_FILE = os.path.join(os.path.dirname(__file__), "enriched_villages.json")

# Our 56 villages — names to match against CSV data
VILLAGE_NAMES = [
    "Rae Bareli", "Lalganj", "Salon", "Dalmau", "Unchahar", "Bachhrawan",
    "Harchandpur", "Tiloi", "Sareni", "Maharajganj", "Khiri", "Jagatpur",
    "Amawa", "Parsadepur", "Khajurgaon", "Deeh", "Rohaniya", "Semra",
    "Pindra", "Fatehpur Chaurasi", "Mukundpur", "Sirsanwa", "Rawatpur",
    "Bhitauli", "Kunda", "Khishni", "Barauli", "Atarha", "Paschimgaon",
    "Soraon", "Gaura", "Chanda", "Bhagwantpur", "Nindura", "Husainpur",
    "Balrampur Kalan", "Rampur Kalan", "Katghara", "Bisawan", "Maholi",
    "Padri", "Khajuriha", "Bhavanpur", "Anwarpur", "Musafirkhana",
    "Daryapur", "Jafarganj", "Sikandarpur", "Bahadurpur", "Chandpur",
    "Gurdaha", "Nanpara", "Shivgarh", "Ramnagar", "Semari", "Gauriganj",
]


def normalize(name: str) -> str:
    """Lowercase, strip spaces and punctuation for fuzzy matching"""
    return re.sub(r"[^a-z0-9]", "", name.lower().strip())


def fuzzy_match(csv_name: str, our_names: list) -> str | None:
    """Find best matching village name from our list"""
    cn = normalize(csv_name)
    for name in our_names:
        if normalize(name) in cn or cn in normalize(name):
            return name
    return None


def process_village_amenities() -> dict:
    """
    Extract from village_amenities.csv:
    - Total population
    - Total households
    - PHC availability and distance
    - Hospital availability and distance
    - Road type (pucca/kuchha)
    - Water source
    - Nearest town distance
    """
    profiles = {}
    filepath = os.path.join(RAW_DIR, "village_amenities.csv")
    if not os.path.exists(filepath):
        print("village_amenities.csv not found")
        return profiles

    with open(filepath, encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            village_name = row.get("Village Name", "").strip()
            matched = fuzzy_match(village_name, VILLAGE_NAMES)
            if not matched:
                continue

            def safe_int(val, default=0):
                try: return int(str(val).strip().replace(",", "")) if val and str(val).strip() not in ("NA", "", "N.A.") else default
                except: return default

            def safe_float(val, default=0.0):
                try: return float(str(val).strip().replace(",", "")) if val and str(val).strip() not in ("NA", "", "N.A.") else default
                except: return default

            population  = safe_int(row.get("Total Population of Village", 0))
            households  = safe_int(row.get("Total  Households ", 0))
            sc_pop      = safe_int(row.get("Total Scheduled Castes Population of Village", 0))
            st_pop      = safe_int(row.get("Total Scheduled Tribes Population of Village", 0))

            # PHC distance code: a=<5km, b=5-10km, c=10+km, blank=available in village
            phc_in_village = safe_int(row.get("Primary Health Centre (Numbers)", 0)) > 0
            phc_dist_code  = row.get("(If Primary Health Centre not available within the village, the distance range code of nearest place where facility is available is given viz; a for < 5 Kms, b for 5-10 Kms and c for 10+ kms ). ", "").strip()
            phc_dist_label = "In village" if phc_in_village else {"a": "<5 km", "b": "5-10 km", "c": "10+ km"}.get(phc_dist_code, "Unknown")

            hosp_in_village = safe_int(row.get("Hospital Allopathic (Numbers)", 0)) > 0
            hosp_dist_code  = row.get("(If Hospital Allopathic not available within the village, the distance range code of nearest place where facility is available is given viz; a for < 5 Kms, b for 5-10 Kms and c for 10+ kms ). ", "").strip()
            hosp_dist_label = "In village" if hosp_in_village else {"a": "<5 km", "b": "5-10 km", "c": "10+ km"}.get(hosp_dist_code, "Unknown")

            # Road type
            has_pucca = safe_int(row.get("Black Topped (pucca) Road (Status A(1)/NA(2))", 2)) == 1
            has_kuchha = safe_int(row.get("Gravel (kuchha) Roads (Status A(1)/NA(2))", 2)) == 1
            road_type = "pucca" if has_pucca else ("kuchha" if has_kuchha else "unknown")

            # Water source
            has_tap = safe_int(row.get("Tap Water-Treated (Status A(1)/NA(2))", 2)) == 1
            has_handpump = safe_int(row.get("Hand Pump (Status A(1)/NA(2))", 2)) == 1
            water_source = "tap" if has_tap else ("handpump" if has_handpump else "other")

            # Nearest town
            nearest_town = row.get("Nearest Town Name", "").strip()
            nearest_town_dist = safe_float(row.get("Nearest Town Distance from Village (in Km.)", 0))

            # Power supply
            has_power = safe_int(row.get("Power Supply For Domestic Use (Status A(1)/NA(2))", 2)) == 1

            # Anganwadi (nutrition centre)
            has_anganwadi = safe_int(row.get("Nutritional Centres-Anganwadi Centre (Status A(1)/NA(2))", 2)) == 1

            if matched not in profiles:
                profiles[matched] = {
                    "population": 0, "households": 0,
                    "sc_population": 0, "st_population": 0,
                }

            # Accumulate (multiple rows may match same village)
            profiles[matched]["population"]    += population
            profiles[matched]["households"]    += households
            profiles[matched]["sc_population"] += sc_pop
            profiles[matched]["st_population"] += st_pop
            profiles[matched]["phc_distance"]   = phc_dist_label
            profiles[matched]["hospital_distance"] = hosp_dist_label
            profiles[matched]["road_type"]      = road_type
            profiles[matched]["water_source"]   = water_source
            profiles[matched]["has_power"]      = has_power
            profiles[matched]["has_anganwadi"]  = has_anganwadi
            profiles[matched]["nearest_town"]   = nearest_town
            profiles[matched]["nearest_town_dist_km"] = nearest_town_dist

    print(f"Village amenities: matched {len(profiles)} villages")
    return profiles


def process_education() -> dict:
    """Extract school enrollment data from UDISE dataset"""
    edu = {}
    filepath = os.path.join(RAW_DIR, "UDISE_plus-19-20_enrol_rae_bareli_up.csv")
    if not os.path.exists(filepath):
        return edu

    with open(filepath, encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            school_name = row.get("School Name", "") or row.get("school_name", "")
            village = row.get("Village", "") or row.get("village", "") or row.get("Habitation", "")
            matched = fuzzy_match(village, VILLAGE_NAMES)
            if not matched:
                continue

            def safe_int(v):
                try: return int(str(v).strip()) if v and str(v).strip() not in ("NA","") else 0
                except: return 0

            total_enrol = safe_int(row.get("Total Enrolment", 0) or row.get("total_enrolment", 0))
            girls_enrol = safe_int(row.get("Girls Enrolment", 0) or row.get("girls_enrolment", 0))

            if matched not in edu:
                edu[matched] = {"total_enrollment": 0, "girls_enrollment": 0, "school_count": 0}
            edu[matched]["total_enrollment"] += total_enrol
            edu[matched]["girls_enrollment"] += girls_enrol
            edu[matched]["school_count"]     += 1

    print(f"Education: matched {len(edu)} villages")
    return edu


def process_sanitation() -> dict:
    """Extract sanitation coverage from SBM dataset"""
    san = {}
    filepath = os.path.join(RAW_DIR, "sbm__uttar_pradesh__rae_bareli.csv")
    if not os.path.exists(filepath):
        return san

    with open(filepath, encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            village = row.get("Village Name", "") or row.get("village_name", "")
            matched = fuzzy_match(village, VILLAGE_NAMES)
            if not matched:
                continue

            def safe_float(v):
                try: return float(str(v).strip().replace("%","")) if v and str(v).strip() not in ("NA","") else 0.0
                except: return 0.0

            coverage = safe_float(row.get("Coverage %", 0) or row.get("coverage", 0) or row.get("ODF Status", 0))
            san[matched] = {"sanitation_coverage_pct": coverage}

    print(f"Sanitation: matched {len(san)} villages")
    return san


def compute_vulnerability_score(profile: dict) -> int:
    """
    Compute a vulnerability score 0-100 for each village.
    Higher = more vulnerable = needs more attention.
    Used by Gemini for smarter priority scoring.
    """
    score = 0

    # Hospital far away → more vulnerable
    hosp = profile.get("hospital_distance", "")
    if hosp == "10+ km":   score += 25
    elif hosp == "5-10 km": score += 15
    elif hosp == "<5 km":   score += 5

    # PHC far away
    phc = profile.get("phc_distance", "")
    if phc == "10+ km":    score += 20
    elif phc == "5-10 km": score += 10

    # Kuchha road → harder to reach
    if profile.get("road_type") == "kuchha": score += 15

    # No power
    if not profile.get("has_power", True): score += 10

    # Large population → more people at risk
    pop = profile.get("population", 0)
    if pop > 10000:   score += 15
    elif pop > 5000:  score += 10
    elif pop > 2000:  score += 5

    # Low sanitation
    san = profile.get("sanitation_coverage_pct", 100)
    if san < 30:   score += 15
    elif san < 60: score += 8

    return min(score, 100)


def main():
    print("Processing all 1773 villages...")
    
    enriched = {}
    filepath = os.path.join(RAW_DIR, "village_amenities.csv")
    
    with open(filepath, encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            village_name = row.get("Village Name", "").strip()
            if not village_name:
                continue

            def safe_int(val, default=0):
                try: return int(str(val).strip().replace(",", "")) if val and str(val).strip() not in ("NA", "", "N.A.") else default
                except: return default

            def safe_float(val, default=0.0):
                try: return float(str(val).strip().replace(",", "")) if val and str(val).strip() not in ("NA", "", "N.A.") else default
                except: return default

            phc_in_village = safe_int(row.get("Primary Health Centre (Numbers)", 0)) > 0
            phc_dist_code = row.get("(If Primary Health Centre not available within the village, the distance range code of nearest place where facility is available is given viz; a for < 5 Kms, b for 5-10 Kms and c for 10+ kms ). ", "").strip()
            phc_dist_label = "In village" if phc_in_village else {"a": "<5 km", "b": "5-10 km", "c": "10+ km"}.get(phc_dist_code, "Unknown")

            hosp_in_village = safe_int(row.get("Hospital Allopathic (Numbers)", 0)) > 0
            hosp_dist_code = row.get("(If Hospital Allopathic not available within the village, the distance range code of nearest place where facility is available is given viz; a for < 5 Kms, b for 5-10 Kms and c for 10+ kms ). ", "").strip()
            hosp_dist_label = "In village" if hosp_in_village else {"a": "<5 km", "b": "5-10 km", "c": "10+ km"}.get(hosp_dist_code, "Unknown")

            profile = {
                "village_name": village_name,
                "cd_block": row.get("CD Block Name", "").strip(),
                "gram_panchayat": row.get("Gram Panchayat Name", "").strip(),
                "population": safe_int(row.get("Total Population of Village", 0)),
                "households": safe_int(row.get("Total  Households ", 0)),
                "sc_population": safe_int(row.get("Total Scheduled Castes Population of Village", 0)),
                "phc_distance": phc_dist_label,
                "hospital_distance": hosp_dist_label,
                "road_type": "pucca" if safe_int(row.get("Black Topped (pucca) Road (Status A(1)/NA(2))", 2)) == 1 else "kuchha",
                "water_source": "tap" if safe_int(row.get("Tap Water-Treated (Status A(1)/NA(2))", 2)) == 1 else "handpump",
                "has_power": safe_int(row.get("Power Supply For Domestic Use (Status A(1)/NA(2))", 2)) == 1,
                "has_anganwadi": safe_int(row.get("Nutritional Centres-Anganwadi Centre (Status A(1)/NA(2))", 2)) == 1,
                "has_mobile_coverage": safe_int(row.get("Mobile Phone Coverage (Status A(1)/NA(2))", 2)) == 1,
                "has_pucca_road": safe_int(row.get("Black Topped (pucca) Road (Status A(1)/NA(2))", 2)) == 1,
                "nearest_town": row.get("Nearest Town Name", "").strip(),
                "nearest_town_dist_km": safe_float(row.get("Nearest Town Distance from Village (in Km.)", 0)),
            }

            profile["vulnerability_score"] = compute_vulnerability_score(profile)
            enriched[village_name] = profile

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, indent=2, ensure_ascii=False)

    print(f"✅ Done. {len(enriched)} villages enriched → {OUT_FILE}")
    for name, data in list(enriched.items())[:3]:
        print(f"  {name}: pop={data.get('population',0)}, vuln={data.get('vulnerability_score',0)}, hospital={data.get('hospital_distance','?')}")

if __name__ == "__main__":
    main()