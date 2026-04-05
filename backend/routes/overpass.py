"""
Layer 2C — OpenStreetMap Overpass API
Queries nearest health/infrastructure facilities for any village.
Free, no API key, always up to date.
"""

import httpx
from fastapi import APIRouter

router = APIRouter()

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


async def query_nearest_facilities(lat: float, lng: float, radius_km: int = 20) -> dict:
    """
    Query nearest PHC, hospital, school, police station around a coordinate.
    Returns distances and names.
    """
    radius_m = radius_km * 1000
    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:{radius_m},{lat},{lng});
      node["amenity"="clinic"](around:{radius_m},{lat},{lng});
      node["healthcare"="centre"](around:{radius_m},{lat},{lng});
      node["amenity"="school"](around:{radius_m},{lat},{lng});
      node["amenity"="police"](around:{radius_m},{lat},{lng});
    );
    out body;
    """

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            data = resp.json()

        elements = data.get("elements", [])
        facilities = {"hospital": [], "clinic": [], "school": [], "police": []}

        for el in elements:
            tags = el.get("tags", {})
            el_lat = el.get("lat", 0)
            el_lng = el.get("lon", 0)
            name = tags.get("name", tags.get("name:en", "Unknown"))
            amenity = tags.get("amenity", tags.get("healthcare", ""))
            dist_km = round(_haversine(lat, lng, el_lat, el_lng), 1)

            if amenity in ("hospital",):
                facilities["hospital"].append({"name": name, "dist_km": dist_km})
            elif amenity in ("clinic", "centre"):
                facilities["clinic"].append({"name": name, "dist_km": dist_km})
            elif amenity == "school":
                facilities["school"].append({"name": name, "dist_km": dist_km})
            elif amenity == "police":
                facilities["police"].append({"name": name, "dist_km": dist_km})

        # Sort by distance, keep nearest
        for key in facilities:
            facilities[key].sort(key=lambda x: x["dist_km"])
            facilities[key] = facilities[key][:3]

        # Severity upgrade logic
        severity_upgrade = False
        upgrade_reason = None
        nearest_hospital = facilities["hospital"][0]["dist_km"] if facilities["hospital"] else None
        nearest_clinic   = facilities["clinic"][0]["dist_km"]   if facilities["clinic"]   else None

        nearest_health = min(
            [nearest_hospital or 999, nearest_clinic or 999]
        )

        if nearest_health > 15:
            severity_upgrade = True
            upgrade_reason = f"Nearest health facility is {nearest_health}km away"

        return {
            "facilities": facilities,
            "nearest_hospital_km": nearest_hospital,
            "nearest_clinic_km":   nearest_clinic,
            "severity_upgrade":    severity_upgrade,
            "upgrade_reason":      upgrade_reason,
        }

    except Exception as e:
        return {"error": str(e), "facilities": {}, "severity_upgrade": False}


def _haversine(lat1, lng1, lat2, lng2) -> float:
    """Distance in km between two coordinates"""
    import math
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


@router.get("/overpass/facilities")
async def get_facilities(lat: float, lng: float, radius_km: int = 20):
    """Get nearest facilities for given coordinates"""
    result = await query_nearest_facilities(lat, lng, radius_km)
    return {"success": True, **result}
