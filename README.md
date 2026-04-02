# Sanrakshan — Smart Resource Allocation System
 
AI-powered  response system that detects, prioritizes, and resolves rural issues in real time. Especially desgined for rural people. 

Sanrakshan connects affected communities with the right volunteers — powered by Gemini AI, grounded in local data.

---

## The Problem

In rural zones like Raebareli, a affected villager in emergency situations doesn't have time to fill forms. Emergency responders don't know which village needs help most urgently. Volunteers get assigned randomly, not by skill or proximity.

**Sanrakshan solves this with three connected dashboards and real-time AI.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Leaflet, Recharts |
| Backend | FastAPI (Python) |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Authentication (Google Sign-in) |
| AI | Gemini 2.0 Flash (voice processing + priority scoring) |
| Maps | OpenStreetMap + Leaflet, OSRM routing |
| PDF | jsPDF + jspdf-autotable |

---

## Features

### Field Worker Dashboard
- **Voice Report in Hindi/English** — field worker records voice message,  Gemini extracts title, category, location, severity, and affected count automatically
- **Form Report** — manual form with category, location, severity, photo upload
- Real-time report status tracking (pending → assigned → resolved)



### Admin Dashboard
- **Live Map** — 56 villages in Raebareli, markers turn red when issues are active
- **Heatmap Toggle** — switches between marker view and heat intensity view weighted by severity × affected count
- **AI Priority Scoring** — Gemini ranks all active issues 1–100 by urgency, admin sees most critical first
- **Analytics Charts** — issues by category (bar), reports over last 7 days (line), status breakdown (donut)
- **Volunteer Assignment** — assign from map popup, issue card, or sticky assign bar
- **PDF Report Download** — full incident summary with stats + all incidents table


### Volunteer Dashboard
- Tasks assigned by admin appear in real time
- **Route Map** — shows path from volunteer's GPS to the affected village (OSRM routing, no API key needed)
- Distance + ETA displayed
- Mark tasks complete → admin map updates instantly
- Availability toggle syncs to Firestore

---

## Architecture

```
Field Worker (mobile/web)
    ↓ voice/form report
FastAPI Backend ──→ Gemini 2.0 Flash (audio processing, priority scoring)
    ↓
Firestore (real-time database)
    ↓ onSnapshot
Admin Dashboard ──→ map turns red, issue appears, AI score shown
    ↓ assign volunteer
Volunteer Dashboard ──→ task appears with route map
    ↓ mark complete
Firestore ──→ admin map turns green
```

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

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Firebase project with Firestore + Authentication enabled

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # add your Firebase config
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env         # add your Gemini API key
uvicorn main:app --reload --port 8000
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
```

**backend/.env**
```
GEMINI_API_KEY=
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analyze/audio` | Audio blob → structured report JSON via Gemini |
| POST | `/api/analyze/text` | Text description → structured report JSON |
| POST | `/api/priority` | List of reports → priority scores 1–100 with reasoning |

---

## Villages Data

56 real villages and towns in Raebareli district with accurate GPS coordinates — used for map markers, heatmap, route calculation, and Gemini's location extraction context.

---

## Google Technologies Used

- **Gemini 2.0 Flash** — voice transcription + structured extraction + priority scoring
- **Firebase Firestore** — real-time database
- **Firebase Authentication** — Google Sign-in
- **Google Maps** (via "Open in Maps" button for volunteer navigation)

---

*Sanrakshan · Raebareli, UP*
