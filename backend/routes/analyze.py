"""
Audio Analysis Route
Step 1: Groq Whisper transcribes audio → text (free, fast, supports Hindi)
Step 2: Gemini extracts structured report from text (category, location, severity etc.)
This avoids Gemini audio quota issues entirely.
"""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from lib.gemini import analyze_text
from lib.pii import redact_report

router = APIRouter()


def get_groq_client():
    try:
        from groq import Groq
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return None
        return Groq(api_key=api_key)
    except ImportError:
        return None


async def transcribe_with_groq(audio_bytes: bytes, mime_type: str) -> str:
    """
    Use Groq Whisper to transcribe audio to text.
    Supports Hindi, English, Bhojpuri.
    Free tier: 28,800 seconds/day — more than enough.
    """
    client = get_groq_client()
    if not client:
        raise ValueError("Groq client not available. Set GROQ_API_KEY in .env")

    # Determine file extension from mime type
    ext_map = {
        "audio/webm": "webm",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/m4a": "m4a",
    }
    ext = ext_map.get(mime_type, "webm")

    # Write to temp file (Groq SDK needs a file object)
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=(f"recording.{ext}", f, mime_type),
                model="whisper-large-v3",
                language="hi",          # Hindi — also handles English/mixed
                response_format="text",
            )
        return str(transcription).strip()
    finally:
        os.unlink(tmp_path)


class TextReportRequest(BaseModel):
    text: str


@router.post("/analyze/audio")
async def analyze_audio_report(audio: UploadFile = File(...)):
    """
    Step 1: Groq Whisper transcribes audio (Hindi/English/Bhojpuri)
    Step 2: Gemini extracts structured report from transcript
    Returns structured JSON with title, category, location, severity, affected, description.
    """
    try:
        audio_bytes = await audio.read()
        mime_type = audio.content_type or "audio/webm"

        # Step 1: Transcribe with Groq Whisper
        try:
            transcript = await transcribe_with_groq(audio_bytes, mime_type)
            if not transcript:
                raise ValueError("Empty transcript")
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Audio transcription failed: {str(e)}. Make sure GROQ_API_KEY is set."
            )

        # Step 2: Extract structured data with Gemini
        result = await analyze_text(transcript)
        if isinstance(result, dict):
            result = redact_report(result)
            result["transcript"] = transcript  # include transcript for transparency

        return {"success": True, "data": result}

    except HTTPException:
        raise
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
