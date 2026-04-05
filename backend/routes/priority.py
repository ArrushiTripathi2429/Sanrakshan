from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.gemini import score_priorities
from routes.overpass import query_nearest_facilities
from routes.village_profiles import get_profile
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

router = APIRouter()

# Village coordinates lookup
from data.villages_coords import VILLAGE_COORDS


class Report(BaseModel):
    id: str
    title: str | None = None
    category: str | None = None
    severity: str | int | None = None
    affected: str | None = None
    village: str | None = None
    location: str | None = None
    lat: float | None = None
    lng: float | None = None


class PriorityRequest(BaseModel):
    reports: list[Report]


@router.post("/priority")
async def get_priority_scores(body: PriorityRequest):
    """
    Accepts a list of active reports.
    Enriches each with:
    - Village profile (Layer 1: population, vulnerability score)
    - Nearest facilities (Layer 2C: Overpass API)
    Returns priorityScore (1-100) + reason + infrastructure context.
    """
    try:
        reports_dicts = []
        infrastructure_context = {}

        for r in body.reports:
            rd = r.model_dump()

            # Get village coords
            village_name = r.village or r.location or ""
            coords = VILLAGE_COORDS.get(village_name)

            # Enrich with Layer 1 static data
            profile = get_profile(village_name)
            if profile:
                rd["vulnerability_score"] = profile.get("vulnerability_score")
                rd["population"]          = profile.get("population")
                rd["hospital_distance"]   = profile.get("hospital_distance")

            # Enrich with Layer 2C live infrastructure (Overpass)
            if coords:
                try:
                    infra = await query_nearest_facilities(coords["lat"], coords["lng"], radius_km=15)
                    rd["nearest_hospital_km"] = infra.get("nearest_hospital_km")
                    rd["nearest_clinic_km"]   = infra.get("nearest_clinic_km")
                    rd["severity_upgrade"]    = infra.get("severity_upgrade", False)
                    infrastructure_context[r.id] = {
                        "facilities":      infra.get("facilities", {}),
                        "severity_upgrade": infra.get("severity_upgrade", False),
                        "upgrade_reason":  infra.get("upgrade_reason"),
                    }
                except Exception:
                    pass  # Overpass timeout → continue without it

            reports_dicts.append(rd)

        result = await score_priorities(reports_dicts)

        # Attach infrastructure context to each result
        if isinstance(result, list):
            for item in result:
                rid = item.get("id")
                if rid and rid in infrastructure_context:
                    item["infrastructure"] = infrastructure_context[rid]

        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
