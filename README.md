# Sanrakshan — Smart Resource Allocation System

> Built for  · Raebareli, Uttar Pradesh, India

Sanrakshan is a Five-layer  relief coordination system that connects affected communities with the right volunteers and NGOs— powered by Gemini AI, grounded in real government data, and proactive through live intelligence feeds.

---

## The Problem

In rural zones like Raebareli, a  villager who is in some kind of emergency situation doesn't have time to fill forms. Emergency responders don't know which village needs help most urgently. Volunteers get assigned randomly, not by skill or proximity. And relief systems are purely reactive — they wait for someone to report before acting.

**Sanrakshan solves this with three connected data layers and a unified AI intelligence engine.**

---

## Architecture — Three Data Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — Static Foundation (AIKosh + data.gov.in)             │
│  1663 village profiles · Population · Health infrastructure     │
│  Road connectivity · Vulnerability scores · Census data         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — Live Dynamic Data                                     │
│  Google News RSS → Gemini early warning alerts                  │
│  Open-Meteo weather forecast → flood risk flags                 │
│  OpenStreetMap Overpass → nearest PHC/hospital per report       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — User Generated Data                                   │
│  Voice reports (Hindi/English) · Form reports · Photos          │
│  GPS auto-location · Real-time Firestore sync                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4 — Intelligence Engine (FastAPI + Gemini)               │
│  Village context enrichment · AI priority scoring               │
│  Heuristic volunteer matching · Gemini Vision on photos         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Leaflet, Recharts, Aceternity UI |
| Backend | FastAPI (Python) |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Authentication (Google Sign-in) |
| AI — Voice & Text | Gemini 2.0 Flash | Groq API |
| AI — Vision | Gemini 2.0 Flash (multimodal) |
| Maps | Google Maps + Leaflet |
| Routing | OSRM (free, no API key) |
| Infrastructure data | OpenStreetMap Overpass API (free) |
| Weather | Open-Meteo API (free, ECMWF data) |
| News | Google News RSS (free, no API key) |
| Static data | AIKosh + data.gov.in (census, health, education) |
| PDF | jsPDF + jspdf-autotable |

---

## Features

### Layer 1 — Static Foundation
- **1663 village profiles** ingested from data.gov.in census data for Raebareli district
- Each village has: population, households, SC/ST population, PHC distance, hospital distance, road type, water source, power availability, mobile coverage, anganwadi presence
- **Vulnerability score** (0–100) computed per village based on hospital distance, road type, population, sanitation coverage
- Stored in Firestore `villageProfiles` collection, queried by the intelligence engine on every incoming report

### Layer 2 — Live Dynamic Data
- **News Early Warning** — Google News RSS scanned for "Rae Bareli flood/disaster/outbreak" → Gemini triages headlines → relevant alerts appear on admin dashboard with source link. Zero API key needed.
- **Weather Intelligence** — Open-Meteo 7-day rainfall forecast for Raebareli. If heavy rain predicted (≥64.5mm, IMD threshold) → flood risk flag shown on admin dashboard with action recommendation.
- **Overpass Infrastructure** — On every incoming report, nearest hospital/clinic/school/police station queried live. If no health facility within 15km → severity auto-upgraded.

### Layer 3 — User Generated Data

**Field Worker Dashboard**
- Voice report in Hindi/English → Gemini 2.0 Flash transcribes + extracts title, category, location, severity, affected count
- GPS auto-detection → nearest village from 1663-village dataset auto-filled in location field
- Photo upload → Gemini Vision detects issue type, damage severity 1-10, recommended resources → auto-fills form
- Form report with manual fields
- Real-time report status tracking (pending → assigned → resolved)

**Admin Dashboard**
- Live Google Maps showing all 56 key villages, markers turn red on new reports
- Heatmap toggle — heat intensity weighted by severity × affected count
- Village strip — horizontal scrollable pills, red for problem areas
- Weather widget + News early warning panel at top
- AI priority scoring — issues ranked 1-100 using village vulnerability + hospital distance + population
- Analytics charts — by category (bar), last 7 days (line), status breakdown (donut)
- Volunteer assignment — 3 ways: map popup dropdown, issue card inline, sticky assign bar
- PDF report download — full incident summary with stats + all incidents table

**Volunteer Dashboard**
- Tasks assigned by admin appear in real time
- Route map — driving route from volunteer's GPS to affected village (OSRM)
- Distance + ETA shown
- Mark complete → Firestore updated → admin map reflects change
- Availability toggle syncs to Firestore

### Layer 4 — Intelligence Engine
- **Village Context Enrichment** — every report enriched with Layer 1 static data + Layer 2 live infrastructure before Gemini scoring
- **AI Priority Scoring** — Gemini ranks issues 1-100 considering: category, severity, affected count, village vulnerability score, hospital distance, population
- **Heuristic Volunteer Matching** — Score = (0.5 × Proximity) + (0.3 × Skill Match) + (0.2 × Reliability). Gemini assesses skill match. Top 3 shown with "Recommended" badge.
- **Gemini Vision** — photo → damage type + severity + recommended resources

---

## Firestore Schema

### `users/{uid}`
```
name          string
email         string
role          "volunteer" | "field-worker" | "admin"
available     boolean
uid           string
createdAt     timestamp
```

### `reports/{auto-id}`
```
title         string
description   string
category      "flood" | "medical" | "road" | "food" | "education" | "electricity" | "water" | "other"
severity      "low" | "medium" | "high"  (admin) | 1–5 (field worker)
location      string
village       string
villageId     number
affected      string
status        "pending" → "assigned" → "resolved"
assigned      boolean
assignedTo    string
fieldWorkerId string
fieldWorkerName string
createdAt     timestamp
resolvedAt    timestamp
```

### `villageProfiles/{village_id}`
```
villageName         string
population          number
households          number
sc_population       number
phc_distance        string   ("In village" | "<5 km" | "5-10 km" | "10+ km" | "Unknown")
hospital_distance   string
road_type           string   ("pucca" | "kuchha" | "unknown")
water_source        string
has_power           boolean
has_anganwadi       boolean
has_mobile_coverage boolean
nearest_town        string
nearest_town_dist_km number
vulnerability_score number   (0–100)
updatedAt           timestamp
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analyze/audio` | Audio → structured report JSON (Gemini) |
| POST | `/api/analyze/text` | Text → structured report JSON (Gemini) |
| POST | `/api/priority` | Reports → AI priority scores with village context |
| GET  | `/api/weather/raebareli` | 7-day rainfall forecast + flood risk |
| POST | `/api/early-warning/scan` | Scan Google News RSS + Gemini triage |
| GET  | `/api/early-warning/test` | Raw RSS headlines (no Gemini) |
| GET  | `/api/village-profiles` | All 1663 village profiles |
| GET  | `/api/village-profiles/{name}` | Single village profile |
| GET  | `/api/overpass/facilities` | Nearest facilities for coordinates |
| POST | `/api/volunteer-match` | Heuristic volunteer matching |
| POST | `/api/vision/analyze-photo` | Gemini Vision photo analysis |

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Firebase project with Firestore + Authentication enabled
- Gemini API key from [aistudio.google.com](https://aistudio.google.com)
- Google Maps API key (optional, falls back to OpenStreetMap)

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # add Firebase config + Google Maps key
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env         # add Gemini API key
uvicorn main:app --reload --port 8000
```

### Upload Village Profiles (one-time)
```bash
# Download service account key from Firebase Console → Project Settings → Service Accounts
# Save as backend/data/serviceAccountKey.json
pip install firebase-admin
python backend/data/process_datasets.py   # process raw CSVs
python backend/data/upload_to_firestore.py # upload to Firestore
```

### Environment Variables

**frontend/.env.local**
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
```

**backend/.env**
```
GEMINI_API_KEY=
```

---

## Data Sources

| Dataset | Source | Used for |
|---|---|---|
| Village amenities census | data.gov.in | Population, PHC, hospital, road, water data |
| AHS mortality data | data.gov.in | Health indicators |
| UDISE school enrollment | data.gov.in | Education data |
| SBM sanitation data | data.gov.in | Sanitation coverage |
| Weather forecast | Open-Meteo (ECMWF) | Flood risk prediction |
| News feeds | Google News RSS | Early warning alerts |
| Infrastructure | OpenStreetMap Overpass | Live facility locations |

---

## Google Technologies Used

- **Gemini 2.0 Flash** — voice transcription, structured extraction, priority scoring, photo analysis, news triage
- **Firebase Firestore** — real-time database
- **Firebase Authentication** — Google Sign-in
- **Google Maps Platform** — map tiles
- **Google News RSS** — early warning feed

---

*Sanrakshan · Google Solution Challenge 2026 · Raebareli, Uttar Pradesh*
