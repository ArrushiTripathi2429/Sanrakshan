"""
Village Profiles — reads from Firestore villageProfiles collection.
1663 villages uploaded from census data.
"""

import os
from fastapi import APIRouter

router = APIRouter()

# In-memory cache loaded at startup from Firestore
_profiles: dict = {}


def _load_from_firestore():
    """Load all village profiles from Firestore into memory cache."""
    global _profiles
    try:
        import firebase_admin
        from firebase_admin import firestore as fs

        # Reuse existing app if already initialized
        try:
            app = firebase_admin.get_app()
        except ValueError:
            import json
            key_path = os.path.join(os.path.dirname(__file__), "..", "data", "serviceAccountKey.json")
            if os.path.exists(key_path):
                from firebase_admin import credentials
                cred = credentials.Certificate(key_path)
                app = firebase_admin.initialize_app(cred)
            else:
                print("serviceAccountKey.json not found — falling back to local JSON")
                _load_from_json()
                return

        db = fs.client()
        docs = db.collection("villageProfiles").stream()
        _profiles = {}
        for doc in docs:
            data = doc.to_dict()
            name = data.get("villageName", doc.id.replace("_", " ").title())
            _profiles[name] = data
        print(f"Loaded {len(_profiles)} village profiles from Firestore")

    except Exception as e:
        print(f"Firestore load failed: {e} — falling back to local JSON")
        _load_from_json()


def _load_from_json():
    """Fallback: load from local enriched_villages.json"""
    global _profiles
    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "enriched_villages.json")
    if os.path.exists(json_path):
        import json
        with open(json_path, encoding="utf-8") as f:
            _profiles = json.load(f)
        print(f"Loaded {len(_profiles)} village profiles from local JSON")
    else:
        print("No village profile data found")


# Load on import
_load_from_firestore()


def get_profile(village_name: str) -> dict:
    """Get enriched profile for a village by name (fuzzy match)."""
    if not village_name:
        return {}
    lower = village_name.lower().strip()
    # Exact match first
    for name, data in _profiles.items():
        if name.lower() == lower:
            return {**data, "village_name": name}
    # Partial match
    for name, data in _profiles.items():
        if lower in name.lower() or name.lower() in lower:
            return {**data, "village_name": name}
    return {}


def get_all_profiles() -> dict:
    return _profiles


@router.get("/village-profiles")
def list_profiles():
    return {"success": True, "count": len(_profiles), "data": _profiles}


@router.get("/village-profiles/{village_name}")
def get_village_profile(village_name: str):
    profile = get_profile(village_name)
    if not profile:
        return {"success": False, "message": f"No profile found for '{village_name}'"}
    return {"success": True, "data": profile}
