from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from lib.gemini import analyze_audio, analyze_text
from lib.pii import redact_report

router = APIRouter()


class TextReportRequest(BaseModel):
    text: str


@router.post("/analyze/audio")
async def analyze_audio_report(audio: UploadFile = File(...)):
    """
    Accepts an audio file from the field worker's mic.
    Returns structured report JSON extracted by Gemini — PII redacted.
    """
    try:
        audio_bytes = await audio.read()
        mime_type = audio.content_type or "audio/webm"
        result = await analyze_audio(audio_bytes, mime_type)
        # Redact any PII Gemini may have extracted (phone numbers, Aadhaar, emails)
        if isinstance(result, dict):
            result = redact_report(result)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/text")
async def analyze_text_report(body: TextReportRequest):
    """
    Accepts a text description.
    Returns structured report JSON extracted by Gemini — PII redacted.
    """
    try:
        result = await analyze_text(body.text)
        if isinstance(result, dict):
            result = redact_report(result)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
