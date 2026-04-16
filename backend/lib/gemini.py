# all gemini related stuff here. 
import os
import json
import re
import asyncio
import google.generativeai as genai
from groq import Groq
from pathlib import Path
from dotenv import load_dotenv
from lib.queue import gemini_limiter

load_dotenv()

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

# ── Models
model = genai.GenerativeModel("gemini-2.5-flash")
_gemini_concurrency = asyncio.Semaphore(4)


EXTRACT_PROMPT = """
You are an AI assistant for Sanrakshan, a disaster relief system in Raebareli district, Uttar Pradesh, India.

A field worker has reported an emergency. Extract the following details and return ONLY valid JSON.

Known villages in Raebareli district:
Rae Bareli, Lalganj, Salon, Dalmau, Unchahar, Bachhrawan, Harchandpur, Tiloi, Sareni, Maharajganj,
Khiri, Jagatpur, Amawa, Parsadepur, Khajurgaon, Deeh, Rohaniya, Semra, Pindra, Fatehpur Chaurasi,
Mukundpur, Sirsanwa, Rawatpur, Bhitauli, Kunda, Khishni, Barauli, Atarha, Paschimgaon, Soraon,
Gaura, Chanda, Bhagwantpur, Nindura, Husainpur, Balrampur Kalan, Rampur Kalan, Katghara, Bisawan,
Maholi, Padri, Khajuriha, Bhavanpur, Anwarpur, Musafirkhana, Daryapur, Jafarganj, Sikandarpur,
Bahadurpur, Chandpur, Gurdaha, Nanpara, Shivgarh, Ramnagar, Semari, Gauriganj

Report input:
{input}

Return ONLY this JSON (no markdown, no explanation):
{{
  "title": "short title max 60 chars",
  "category": "one of: flood | medical | road | food | education | electricity | water | other",
  "location": "best matching village name from the list above, or the location mentioned",
  "severity": <integer 1-5, where 5 is most critical>,
  "affected": "estimated number of people affected as string",
  "description": "clear 2-3 sentence summary of the issue in English"
}}
"""

PRIORITY_PROMPT = """
You are a disaster relief coordinator for Raebareli district, India.

Given the following active reports, rank them by urgency and assign a priority score (1-100).
Consider: severity level, number of people affected, category (flood/medical are highest), recency,
AND the village vulnerability score (higher vulnerability = harder to reach, fewer resources).

Reports:
{reports}

Return ONLY a JSON array (no markdown):
[
  {{"id": "report_id", "priorityScore": <1-100>, "reason": "one line reason"}}
]
"""


async def generate_content_with_backoff(payload, retries: int = 2):
    """
    Queue/throttle Gemini calls with bounded concurrency and retry.
    """
    last_error = None
    for attempt in range(retries + 1):
        await gemini_limiter.acquire()
        try:
            async with _gemini_concurrency:
                return await asyncio.to_thread(model.generate_content, payload)
        except Exception as e:
            last_error = e
            if attempt < retries:
                await asyncio.sleep(1.5 * (attempt + 1))
    raise last_error


async def analyze_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    """
    Step 1: Transcribe audio via Groq Whisper (free, fast, handles Hinglish)
    Step 2: Extract structured report via Gemini (existing flow)
    """
    transcription = await asyncio.to_thread(
        groq_client.audio.transcriptions.create,
        file=("audio.webm", audio_bytes, mime_type),
        model="whisper-large-v3-turbo",
        language="hi",  # handles Hindi + English mix
    )

    transcript_text = transcription.text
    if not transcript_text.strip():
        raise ValueError("Could not transcribe audio — file may be empty or corrupted")

    # pass transcript to Gemini for structuring
    return await analyze_text(transcript_text)


async def analyze_text(text: str) -> dict:
    """
    Send text description to Gemini and extract structured disaster report.
    Used directly for text input, and as second stage after Groq audio transcription.
    """
    prompt = EXTRACT_PROMPT.format(input=text)
    response = await generate_content_with_backoff(prompt)
    return _parse_json_response(response.text)


async def score_priorities(reports: list[dict]) -> list[dict]:
    """
    Given a list of active reports, return them with priority scores.
    Enriches with village vulnerability data from Layer 1.
    """
    if not reports:
        return []

    try:
        from routes.village_profiles import get_profile
    except Exception:
        def get_profile(x): return {}

    reports_text = "\n".join([
        f"- ID: {r.get('id')} | Category: {r.get('category')} | "
        f"Severity: {r.get('severity')} | Affected: {r.get('affected', 'unknown')} | "
        f"Location: {r.get('village') or r.get('location')} | "
        f"Title: {r.get('title', '')} | "
        f"Village Vulnerability: {get_profile(r.get('village') or r.get('location', '')).get('vulnerability_score', 'unknown')} | "
        f"Hospital Distance: {get_profile(r.get('village') or r.get('location', '')).get('hospital_distance', 'unknown')} | "
        f"Population: {get_profile(r.get('village') or r.get('location', '')).get('population', 'unknown')}"
        for r in reports
    ])

    prompt = PRIORITY_PROMPT.format(reports=reports_text)
    response = await generate_content_with_backoff(prompt)
    return _parse_json_response(response.text)


def _parse_json_response(text: str) -> dict | list:
    """Strip markdown fences and parse JSON from Gemini response."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise ValueError(f"Could not parse Gemini response as JSON: {text[:200]}")