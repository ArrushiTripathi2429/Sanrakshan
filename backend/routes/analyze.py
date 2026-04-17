"""
Audio Analysis Route
Step 1: Groq Whisper transcribes audio → text (free, fast, supports Hindi)
Step 2: Gemini extracts structured report from text (category, location, severity etc.)
This avoids Gemini audio quota issues entirely.
"""

import os
import tempfile
import math
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from lib.gemini import analyze_text
from lib.pii import redact_report

router = APIRouter()

# Village coordinates for GPS fallback
VILLAGES = [
    {"name":"Rae Bareli","lat":26.2303,"lng":81.2409},{"name":"Lalganj","lat":26.2477,"lng":81.7098},
    {"name":"Salon","lat":26.1586,"lng":81.4369},{"name":"Dalmau","lat":25.9939,"lng":81.0450},
    {"name":"Unchahar","lat":26.1013,"lng":81.3594},{"name":"Bachhrawan","lat":26.4710,"lng":81.1127},
    {"name":"Harchandpur","lat":26.3933,"lng":81.0831},{"name":"Tiloi","lat":26.0419,"lng":81.5134},
    {"name":"Sareni","lat":26.2450,"lng":81.0311},{"name":"Maharajganj","lat":26.1316,"lng":81.4574},
    {"name":"Khiri","lat":26.3100,"lng":81.1900},{"name":"Jagatpur","lat":26.1500,"lng":81.1500},
    {"name":"Amawa","lat":26.1800,"lng":81.2100},{"name":"Parsadepur","lat":26.3800,"lng":81.2600},
    {"name":"Dalmau","lat":25.9939,"lng":81.0450},{"name":"Gauriganj","lat":26.4743,"lng":81.5791},
]

def _nearest_village(lat: float, lng: float) -> str:
    """Find nearest village name from GPS coordinates."""
    best, best_dist = None, float("inf")
    for v in VILLAGES:
        d = math.sqrt((v["lat"]-lat)**2 + (v["lng"]-lng)**2)
        if d < best_dist:
            best_dist = d
            best = v["name"]
    return best


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
async def analyze_audio_report(
    audio: UploadFile = File(...),
    lat: float = None,
    lng: float = None,
):
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

        # Step 2: Extract structured data with Groq/Gemini
        result = await analyze_text(transcript)
        if isinstance(result, dict):
            result = redact_report(result)
            result["transcript"] = transcript

            # GPS fallback: if location not detected, use coordinates
            location = result.get("location", "").strip()
            if (not location or location.lower() in ["", "unknown", "raebareli district", "raebareli"]) and lat and lng:
                nearest = _nearest_village(lat, lng)
                if nearest:
                    result["location"] = nearest
                    result["location_source"] = "gps"
            else:
                result["location_source"] = "voice"

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
