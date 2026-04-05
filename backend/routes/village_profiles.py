import json
import os
from fastapi import APIRouter

router = APIRouter()

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "enriched_villages.json")

# Load once at startup
_profiles: dict = {}
try:
    with open(DATA_FILE, encoding="utf-8") as f:
        _profiles = json.load(f)
    print(f"Loaded {len(_profiles)} village profiles from Layer 1 data")
except Exception as e:
    print(f"Could not load village profiles: {e}")


def get_profile(village_name: str) -> dict:
    """Get enriched profile for a village by name (case-insensitive)"""
    if not village_name:
        return {}
    lower = village_name.lower().strip()
    for name, data in _profiles.items():
        if name.lower() == lower or lower in name.lower() or name.lower() in lower:
            return {**data, "village_name": name}
    return {}


def get_all_profiles() -> dict:
    return _profiles


@router.get("/village-profiles")
def list_profiles():
    """Return all enriched village profiles"""
    return {"success": True, "count": len(_profiles), "data": _profiles}


@router.get("/village-profiles/{village_name}")
def get_village_profile(village_name: str):
    """Return enriched profile for a specific village"""
    profile = get_profile(village_name)
    if not profile:
        return {"success": False, "message": f"No profile found for '{village_name}'"}
    return {"success": True, "data": profile}
