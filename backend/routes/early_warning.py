import os
import xml.etree.ElementTree as ET
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import httpx
from lib.gemini import generate_content_with_backoff

router = APIRouter()

# ── RSS feeds to monitor ──────────────────────────────────────────────────────
RSS_QUERIES = [
    "Rae+Bareli+flood",
    "Rae+Bareli+disaster",
    "Rae+Bareli+health+outbreak",
    "Uttar+Pradesh+flood+Raebareli",
    "Raebareli+emergency",
]

GEMINI_TRIAGE_PROMPT = """
You are a disaster alert system for Raebareli district, Uttar Pradesh, India.

Analyze these news headlines and determine if any describe an active emergency or disaster 
relevant to Raebareli district or nearby areas in UP.

Headlines:
{headlines}

For each relevant headline, extract:
- Is it relevant to Raebareli or nearby UP districts? (yes/no)
- What type of issue: flood | medical | road | food | other
- Estimated severity: low | medium | high
- Which location/village if mentioned
- A short 1-line summary

Return ONLY valid JSON array (no markdown):
[
  {{
    "relevant": true,
    "title": "short alert title",
    "category": "flood",
    "severity": "high",
    "location": "village or area name, or 'Raebareli district' if general",
    "summary": "one line summary",
    "source_url": "original article url"
  }}
]

If no headlines are relevant, return empty array: []
"""


async def fetch_rss(query: str) -> list[dict]:
    """Fetch Google News RSS for a query and return list of {title, url}"""
    url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return []
        root = ET.fromstring(resp.text)
        items = []
        for item in root.findall(".//item")[:5]:  # top 5 per query
            title = item.findtext("title", "")
            link  = item.findtext("link", "")
            if title:
                items.append({"title": title, "url": link})
        return items
    except Exception as e:
        print(f"RSS fetch error for {query}: {e}")
        return []


async def triage_with_gemini(headlines: list[dict]) -> list[dict]:
    """Send headlines to Gemini for relevance triage"""
    if not headlines:
        return []
    formatted = "\n".join([f"- {h['title']} ({h['url']})" for h in headlines])
    prompt = GEMINI_TRIAGE_PROMPT.format(headlines=formatted)
    try:
        response = await generate_content_with_backoff(prompt)
        import json, re
        text = re.sub(r"```(?:json)?\s*", "", response.text).replace("```", "").strip()
        alerts = json.loads(text)
        # Attach source URLs back
        url_map = {h["title"][:40]: h["url"] for h in headlines}
        for alert in alerts:
            if not alert.get("source_url"):
                alert["source_url"] = ""
        return [a for a in alerts if a.get("relevant")]
    except Exception as e:
        print(f"Gemini triage error: {e}")
        return []


@router.post("/early-warning/scan")
async def scan_news(background_tasks: BackgroundTasks):
    """
    Scan Google News RSS for Raebareli-related disaster news.
    Returns detected alerts. Call this every few hours via a cron job or manually.
    """
    # Fetch all RSS feeds
    all_headlines = []
    for query in RSS_QUERIES:
        items = await fetch_rss(query)
        all_headlines.extend(items)

    # Deduplicate by title
    seen = set()
    unique = []
    for h in all_headlines:
        if h["title"] not in seen:
            seen.add(h["title"])
            unique.append(h)

    if not unique:
        return {
            "success": True,
            "alerts": [],
            "headlines_scanned": 0,
            "message": "No recent alerts",
        }

    # Triage with Gemini
    alerts = await triage_with_gemini(unique)

    return {
        "success": True,
        "headlines_scanned": len(unique),
        "alerts": alerts,
        "message": "No recent alerts" if not alerts else "Alerts detected",
        "scanned_at": datetime.utcnow().isoformat(),
    }


@router.get("/early-warning/test")
async def test_scan():
    """Quick test endpoint — returns raw RSS headlines without Gemini triage"""
    headlines = []
    for query in RSS_QUERIES[:2]:
        items = await fetch_rss(query)
        headlines.extend(items)
    return {"headlines": headlines[:10]}
