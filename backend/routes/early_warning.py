import os
import xml.etree.ElementTree as ET
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks
import httpx

router = APIRouter()

RSS_QUERIES = [
    "Rae+Bareli+flood",
    "Rae+Bareli+disaster",
    "Rae+Bareli+health+outbreak",
    "Uttar+Pradesh+flood+Raebareli",
    "Raebareli+emergency",
]

KEYWORDS = ["flood", "rain", "disaster", "emergency", "outbreak", "storm", "relief", "UP", "Uttar Pradesh", "Raebareli", "Rae Bareli"]


async def fetch_rss(query: str) -> list[dict]:
    url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return []
        root = ET.fromstring(resp.text)
        items = []
        for item in root.findall(".//item")[:5]:
            title = item.findtext("title", "")
            link  = item.findtext("link", "")
            if title:
                items.append({"title": title, "url": link})
        return items
    except Exception as e:
        print(f"RSS fetch error for {query}: {e}")
        return []


@router.post("/early-warning/scan")
async def scan_news(background_tasks: BackgroundTasks):
    all_headlines = []
    for query in RSS_QUERIES:
        items = await fetch_rss(query)
        all_headlines.extend(items)

    # Deduplicate
    seen = set()
    unique = []
    for h in all_headlines:
        if h["title"] not in seen:
            seen.add(h["title"])
            unique.append(h)

    # Keyword filter — no Gemini
    alerts = [
        {
            "relevant": True,
            "title": h["title"].split(" - ")[0],
            "category": "other",
            "severity": "medium",
            "location": "Raebareli district",
            "summary": h["title"].split(" - ")[0],
            "source_url": h["url"],
        }
        for h in unique
        if any(kw.lower() in h["title"].lower() for kw in KEYWORDS)
    ]

    return {
        "success": True,
        "headlines_scanned": len(unique),
        "alerts": alerts,
        "message": "No recent alerts" if not alerts else "Alerts detected",
        "scanned_at": datetime.utcnow().isoformat(),
    }


@router.get("/early-warning/test")
async def test_scan():
    headlines = []
    for query in RSS_QUERIES[:2]:
        items = await fetch_rss(query)
        headlines.extend(items)
    return {"headlines": headlines[:10]}