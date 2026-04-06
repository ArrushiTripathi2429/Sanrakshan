"""
Layer 4B — Heuristic Volunteer Matching
Score = (0.5 × Proximity) + (0.3 × SkillMatch) + (0.2 × Reliability)
Returns top 3 volunteers with score + reasoning.
"""

import math
from fastapi import APIRouter
from pydantic import BaseModel
from lib.gemini import generate_content_with_backoff

router = APIRouter()

SKILL_MATCH_PROMPT = """
You are matching volunteers to a disaster relief task.

Task description: {task_description}
Task category: {category}

Volunteer skills:
{volunteer_skills}

For each volunteer, rate their skill match from 0-100 for this specific task.
Consider: relevant skills, experience, task category match.

Return ONLY JSON array (no markdown):
[{{"volunteer_id": "id", "skill_score": 0-100, "reason": "one line"}}]
"""


class VolunteerInput(BaseModel):
    id: str
    name: str
    skills: list[str] = []
    lat: float | None = None
    lng: float | None = None
    resolved_tasks: int = 0
    total_assigned: int = 0
    available: bool = True


class MatchRequest(BaseModel):
    report_id: str
    title: str
    description: str
    category: str
    village_lat: float
    village_lng: float
    volunteers: list[VolunteerInput]


def proximity_score(vol_lat, vol_lng, village_lat, village_lng) -> float:
    """Score 0-100 based on distance. Closer = higher score."""
    if vol_lat is None or vol_lng is None:
        return 50  # unknown location → neutral score
    dist = _haversine(vol_lat, vol_lng, village_lat, village_lng)
    # 0km → 100, 50km → 0
    return max(0, 100 - (dist * 2))


def reliability_score(resolved: int, total: int) -> float:
    """Score 0-100 based on task completion rate."""
    if total == 0:
        return 70  # new volunteer → give benefit of doubt
    return min(100, (resolved / total) * 100)


def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


async def get_skill_scores(task_desc: str, category: str, volunteers: list[VolunteerInput]) -> dict:
    """Use Gemini to score skill match for each volunteer."""
    if not volunteers:
        return {}

    vol_skills_text = "\n".join([
        f"- ID: {v.id} | Name: {v.name} | Skills: {', '.join(v.skills) or 'General'}"
        for v in volunteers
    ])

    prompt = SKILL_MATCH_PROMPT.format(
        task_description=task_desc,
        category=category,
        volunteer_skills=vol_skills_text,
    )

    try:
        response = await generate_content_with_backoff(prompt)
        import json, re
        text = re.sub(r"```(?:json)?\s*", "", response.text).replace("```", "").strip()
        scores = json.loads(text)
        return {s["volunteer_id"]: s for s in scores}
    except Exception as e:
        print(f"Skill match error: {e}")
        # Fallback: neutral scores
        return {v.id: {"volunteer_id": v.id, "skill_score": 50, "reason": "Could not assess"} for v in volunteers}


@router.post("/volunteer-match")
async def match_volunteers(req: MatchRequest):
    """
    Match volunteers to a report using heuristic scoring.
    Returns top 3 with composite score and reasoning.
    """
    available_vols = [v for v in req.volunteers if v.available]
    if not available_vols:
        return {"success": True, "matches": [], "message": "No available volunteers"}

    # Get Gemini skill scores
    skill_scores = await get_skill_scores(
        f"{req.title}. {req.description}",
        req.category,
        available_vols,
    )

    results = []
    for vol in available_vols:
        prox  = proximity_score(vol.lat, vol.lng, req.village_lat, req.village_lng)
        skill = skill_scores.get(vol.id, {}).get("skill_score", 50)
        rel   = reliability_score(vol.resolved_tasks, vol.total_assigned)

        # Composite score
        composite = round((0.5 * prox) + (0.3 * skill) + (0.2 * rel), 1)

        dist_km = None
        if vol.lat and vol.lng:
            dist_km = round(_haversine(vol.lat, vol.lng, req.village_lat, req.village_lng), 1)

        results.append({
            "volunteer_id":   vol.id,
            "volunteer_name": vol.name,
            "composite_score": composite,
            "proximity_score": round(prox, 1),
            "skill_score":     skill,
            "reliability_score": round(rel, 1),
            "distance_km":    dist_km,
            "skill_reason":   skill_scores.get(vol.id, {}).get("reason", ""),
            "recommended":    False,
        })

    # Sort by composite score
    results.sort(key=lambda x: x["composite_score"], reverse=True)

    # Mark top result as recommended
    if results:
        results[0]["recommended"] = True

    return {
        "success": True,
        "report_id": req.report_id,
        "matches": results[:3],
    }
