"""
AI Intelligence Layer
Primary: Groq (llama-3.3-70b) — free, 14,400 req/day, no quota issues
Fallback: Gemini 2.0 Flash — used only if Groq fails
Audio: Groq Whisper — free transcription
"""

import os
import json
import re
import asyncio
import google.generativeai as genai
from dotenv import load_dotenv
from lib.queue import gemini_limiter

load_dotenv()

# ── Gemini setup (fallback) ───────────────────────────────────────────────────
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
gemini_model = genai.GenerativeModel("gemini-2.0-flash")
_gemini_concurrency = asyncio.Semaphore(4)

# ── Groq setup (primary) ──────────────────────────────────────────────────────
def get_groq():
    try:
        from groq import Groq
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            return None
        return Groq(api_key=key)
    except ImportError:
        return None


EXTRACT_PROMPT = """You are an AI assistant for Sanrakshan, a disaster relief system in Raebareli district, Uttar Pradesh, India.

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
}}"""

PRIORITY_PROMPT = """You are a disaster relief coordinator for Raebareli district, India.

Given the following active reports, rank them by urgency and assign a priority score (1-100).
Consider: severity level, number of people affected, category (flood/medical are highest), recency,
AND the village vulnerability score (higher vulnerability = harder to reach, fewer resources).

Reports:
{reports}

Return ONLY a JSON array (no markdown):
[
  {{"id": "report_id", "priorityScore": <1-100>, "reason": "one line reason"}}
]"""


async def _call_groq(prompt: str) -> str:
    """Call Groq LLM (primary). Returns raw text response."""
    client = get_groq()
    if not client:
        raise ValueError("GROQ_API_KEY not set")
    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1024,
    )
    return response.choices[0].message.content


async def _call_gemini(prompt: str) -> str:
    """Call Gemini (fallback). Returns raw text response."""
    last_error = None
    for attempt in range(3):
        await gemini_limiter.acquire()
        try:
            async with _gemini_concurrency:
                response = await asyncio.to_thread(gemini_model.generate_content, prompt)
                return response.text
        except Exception as e:
            last_error = e
            print(f"Gemini attempt {attempt} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
    raise last_error


async def _call_ai(prompt: str) -> str:
    """Try Groq first, fall back to Gemini."""
    try:
        return await _call_groq(prompt)
    except Exception as e:
        print(f"Groq failed ({e}), falling back to Gemini...")
        return await _call_gemini(prompt)


async def analyze_text(text: str) -> dict:
    """Extract structured disaster report from text using Groq → Gemini fallback."""
    prompt = EXTRACT_PROMPT.format(input=text)
    raw = await _call_ai(prompt)
    return _parse_json_response(raw)


async def score_priorities(reports: list[dict]) -> list[dict]:
    """Score and rank reports by urgency using Groq → Gemini fallback."""
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
    raw = await _call_ai(prompt)
    return _parse_json_response(raw)


def _parse_json_response(text: str) -> dict | list:
    """Strip markdown fences and parse JSON."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise ValueError(f"Could not parse AI response as JSON: {text[:200]}")
