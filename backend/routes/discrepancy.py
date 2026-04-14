"""
Layer 4 — Automated Discrepancy Alert
Cross-references incoming field reports against AIKosh census data.
If a report conflicts with known infrastructure, flags it as a discrepancy.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from routes.village_profiles import get_profile

router = APIRouter()

# Rules: (report_category, census_field, census_value_that_conflicts, alert_message)
DISCREPANCY_RULES = [
    (
        "water",
        "water_source",
        ["tap", "handpump"],
        "Census data shows functional water infrastructure in this village. "
        "This may indicate broken/non-functional equipment or outdated data.",
    ),
    (
        "medical",
        "phc_distance",
        ["In village", "<5 km"],
        "Census data shows a PHC within 5km of this village. "
        "Verify if the facility is operational or understaffed.",
    ),
    (
        "education",
        "has_anganwadi",
        [True],
        "Census data shows an Anganwadi centre in this village. "
        "Verify if the centre is functional and staffed.",
    ),
    (
        "electricity",
        "has_power",
        [True],
        "Census data shows this village has power supply. "
        "This may indicate a recent outage or infrastructure failure.",
    ),
    (
        "road",
        "road_type",
        ["pucca"],
        "Census data shows pucca (paved) roads in this village. "
        "Verify if roads are damaged or blocked.",
    ),
]


class DiscrepancyRequest(BaseModel):
    report_id: str
    category: str
    village: str
    location: str | None = None


class DiscrepancyResponse(BaseModel):
    report_id: str
    has_discrepancy: bool
    alert: str | None = None
    census_field: str | None = None
    census_value: str | None = None


@router.post("/discrepancy/check")
def check_discrepancy(body: DiscrepancyRequest) -> DiscrepancyResponse:
    """
    Check if a field report conflicts with AIKosh census data.
    Returns a discrepancy alert if infrastructure data contradicts the report.
    """
    village_name = body.village or body.location or ""
    profile = get_profile(village_name)

    if not profile:
        return DiscrepancyResponse(report_id=body.report_id, has_discrepancy=False)

    category = (body.category or "").lower()

    for rule_cat, field, conflicting_values, message in DISCREPANCY_RULES:
        if rule_cat != category:
            continue
        census_val = profile.get(field)
        if census_val in conflicting_values:
            return DiscrepancyResponse(
                report_id=body.report_id,
                has_discrepancy=True,
                alert=message,
                census_field=field,
                census_value=str(census_val),
            )

    return DiscrepancyResponse(report_id=body.report_id, has_discrepancy=False)
