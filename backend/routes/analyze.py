from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from lib.gemini import analyze_audio, analyze_text
from lib.pii import redact

router = APIRouter()


class TextReportRequest(BaseModel):
    text: str


@router.post("/analyze/audio")
async def analyze_audio_report(
    audio: UploadFile = File(...),
):
    """
    Accepts an audio file (webm/mp4/wav) from the field worker's mic.
    Returns structured report JSON extracted by Gemini.
    """
    try:
        audio_bytes = await audio.read()
        mime_type = audio.content_type or "audio/webm"
        result = await analyze_audio(audio_bytes, mime_type)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/text")
async def analyze_text_report(body: TextReportRequest):
    """
    Accepts a text description (typed or from a fallback).
    Returns structured report JSON extracted by Gemini.
    """
    try:
        result = await analyze_text(body.text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
