"""
Layer 3A — Gemini Vision on Photos
Field worker uploads photo → Gemini Vision detects issue type,
damage severity, and recommended resources.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from lib.gemini import _parse_json_response, gemini_model, _gemini_concurrency
import asyncio

router = APIRouter()

VISION_PROMPT = """
You are a disaster assessment AI for Raebareli district, Uttar Pradesh, India.

Analyze this photo submitted by a field worker and extract:
1. What type of issue is visible
2. Damage severity (1-10)
3. Estimated number of people affected
4. What resources/volunteers are needed
5. Urgency level

Return ONLY valid JSON (no markdown):
{
  "issue_detected": "brief description of what you see",
  "category": "flood | medical | road | food | education | electricity | water | other",
  "damage_severity": <1-10>,
  "estimated_affected": "number as string",
  "recommended_resources": ["resource 1", "resource 2"],
  "urgency": "low | medium | high | critical",
  "confidence": <0-100>,
  "auto_title": "short title for the report (max 60 chars)"
}
"""


@router.post("/vision/analyze-photo")
async def analyze_photo(photo: UploadFile = File(...)):
    """
    Accepts a photo from field worker.
    Returns Gemini Vision analysis: issue type, severity, resources needed.
    """
    try:
        image_bytes = await photo.read()
        mime_type = photo.content_type or "image/jpeg"

        # Validate it's an image
        if not mime_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        async with _gemini_concurrency:
            response = await asyncio.to_thread(gemini_model.generate_content, [
                VISION_PROMPT,
                {"mime_type": mime_type, "data": image_bytes},
            ])

        result = _parse_json_response(response.text)
        return {"success": True, "data": result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
