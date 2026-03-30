from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from lib.gemini import score_priorities

router = APIRouter()


class Report(BaseModel):
    id: str
    title: str | None = None
    category: str | None = None
    severity: str | int | None = None
    affected: str | None = None
    village: str | None = None
    location: str | None = None


class PriorityRequest(BaseModel):
    reports: list[Report]


@router.post("/priority")
async def get_priority_scores(body: PriorityRequest):
    """
    Accepts a list of active reports.
    Returns each report with a priorityScore (1-100) and reason.
    Admin uses this to sort the issue list by urgency.
    """
    try:
        reports_dicts = [r.model_dump() for r in body.reports]
        result = await score_priorities(reports_dicts)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
