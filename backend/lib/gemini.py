import os
import json
import re
import google.generativeai as genai
from pathlib import Path

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# ── Model ────────────────────────────────────────────────────────────────────
model = genai.GenerativeModel("gemini-1.5-flash")

# ── Prompt template for voice/text report extraction ─────────────────────────
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
Consider: severity level, number of people affected, category (flood/medical are highest), and recency.

Reports:
{reports}

Return ONLY a JSON array (no markdown):
[
  {{"id": "report_id", "priorityScore": <1-100>, "reason": "one line reason"}}
]
"""


async def analyze_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    """
    Send audio to Gemini and extract structured disaster report.
    Gemini 1.5 Flash supports audio input natively.
    """
    prompt = EXTRACT_PROMPT.format(input="[Audio transcription follows]")

    response = model.generate_content([
        prompt,
        {"mime_type": mime_type, "data": audio_bytes},
    ])

    return _parse_json_response(response.text)


async def analyze_text(text: str) -> dict:
    """
    Send text description to Gemini and extract structured disaster report.
    Used as fallback when audio processing isn't available.
    """
    prompt = EXTRACT_PROMPT.format(input=text)
    response = model.generate_content(prompt)
    return _parse_json_response(response.text)


async def score_priorities(reports: list[dict]) -> list[dict]:
    """
    Given a list of active reports, return them with priority scores.
    """
    if not reports:
        return []

    # Format reports for the prompt
    reports_text = "\n".join([
        f"- ID: {r.get('id')} | Category: {r.get('category')} | "
        f"Severity: {r.get('severity')} | Affected: {r.get('affected', 'unknown')} | "
        f"Location: {r.get('village') or r.get('location')} | "
        f"Title: {r.get('title', '')}"
        for r in reports
    ])

    prompt = PRIORITY_PROMPT.format(reports=reports_text)
    response = model.generate_content(prompt)
    return _parse_json_response(response.text)


def _parse_json_response(text: str) -> dict | list:
    """Strip markdown fences and parse JSON from Gemini response."""
    # Remove ```json ... ``` or ``` ... ``` wrappers if present
    cleaned = re.sub(r"```(?:json)?\s*", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to extract JSON object/array from the text
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise ValueError(f"Could not parse Gemini response as JSON: {text[:200]}")
