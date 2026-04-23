 Sanrakshan
AI-Powered Disaster Relief Coordination for Rural India

"Sanrakshan" — Sanskrit for Protection

Sanrakshan is a real-time  relief coordination platform built for Raebareli & Amethi districts, Uttar Pradesh. It bridges the gap between field workers on the ground, a central admin, and volunteers — using AI to cut response time and save lives.
Google Solution Challenge 2026 | Team from RGIPT, Rae Bareli

 The Problem
When disasters strike rural UP — floods, medical emergencies, road collapses and chronic issues — coordination breaks down. Field workers have no structured way to report. Admins have no real-time visibility. Volunteers have no routing or task management. Critical hours are lost to phone calls, WhatsApp messages, and guesswork.
Sanrakshan fixes this end-to-end.

 UN Sustainable Development Goals
SDGHow Sanrakshan Addresses ItSDG 1 — No PovertyProtects vulnerable low-income rural communities from disaster-driven economic collapseSDG 3 — Good Health & Well-BeingPrioritizes medical emergencies using AI scoring; routes volunteers to affected villagesSDG 11 — Sustainable Cities & CommunitiesBuilds disaster-resilient rural communities with real-time crisis infrastructure

 

Field Worker: sign in with Google → select Field Worker
Admin: sign in with Google → select Admin
Volunteer: sign in with Google → select Volunteer


 Features
 1. Voice Report in Hindi & English
Field workers hold a button and speak in Hindi or English. Audio goes to Groq Whisper for transcription, then Gemini 2.0 Flash extracts category, location, severity (1–5), affected count, and description — automatically. No literacy required.
 2. Live Crisis Map
Admin sees all 56 Raebareli villages on a map. The moment a report is submitted, that village turns red — no refresh. Powered by Firestore onSnapshot + Leaflet.
 3. Heatmap View
Toggle between marker view and heatmap. Crisis intensity is calculated from severity × affected_count. Deep red = critical. Green = safe.
 4. AI Priority Scoring
Gemini ranks all active reports by urgency (score 1–100), factoring in category, severity, affected count, and village vulnerability scores from AIKosh government datasets (1,663 village profiles). Most critical issue always surfaces first.
 5. Smart Volunteer Assignment (3 ways)
Admin assigns volunteers via map popup, issue card dropdown, or bulk deploy bar. All three sync to Firestore instantly. Volunteer sees the task appear in real time.
 6. Turn-by-Turn Routing for Volunteers
Each task shows a live map: volunteer's GPS → affected village, with driving route via OSRM, distance, and ETA. One tap opens Google Maps navigation.
 7. Live Analytics Dashboard
Real-time Recharts: issues by category (bar), reports over 7 days (line), status breakdown (donut). All update live as data changes.
 8. One-Click PDF Report
Generates a full incident report PDF in-browser via jsPDF — summary stats + complete incident table. No server needed.
 9. Role-Based Google Auth
Single login page, three dashboards. Firebase Auth + Firestore role routing. Field Workers, Admins, and Volunteers each see only what they need.
 10. Volunteer Availability Toggle
Volunteers toggle Available/Busy. Admin sees the status update live on the volunteer list.

 Architecture
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                    │
│              Next.js · Firebase Auth · Leaflet           │
│         Field Worker │ Admin │ Volunteer Dashboards      │
└──────────────┬───────────────────────────┬──────────────┘
               │ REST API                  │ onSnapshot
               ▼                           ▼
┌──────────────────────┐      ┌────────────────────────┐
│   FastAPI Backend    │      │   Firebase Firestore    │
│   (Google Cloud Run) │      │   Real-time Database   │
│                      │      │                        │
│  • Groq Whisper      │      │  reports/              │
│  • Gemini 2.0 Flash  │      │  users/                │
│  • OSRM Routing      │      │  chronicNeeds/         │
│  • Priority Scoring  │      │  needRequests/         │
│  • Village Profiles  │      │  villages/ (1,663)     │
└──────────────────────┘      └────────────────────────┘
Three-Layer Data Architecture:

Static Foundation — 1,663 village profiles from AIKosh government datasets (vulnerability scores, hospital distance, population)
Live Dynamic Layer — Google News RSS + Open-Meteo weather API
User-Generated Layer — Field worker reports, volunteer updates, admin actions



##  Five-Layer Feature Architecture

###  Layer 1 — Static Data Foundation
AIKosh + data.gov.in ingestion pipeline. A Python script pulls government datasets and merges them by village name/pincode into Firestore `village_profiles`:

- 2011 Census village geometries → accurate map coordinates
- PHC / health center locations per district
- School infrastructure + dropout rates (UP)
- Road connectivity (PMGSY data)
- Anganwadi center locations

Every village in the system has a background vulnerability profile. This powers AI scoring with real government data, not guesswork.

---

###  Layer 2 — Live Dynamic Data
Three real-time feeds running as background jobs:

**A. News Early Warning System**
Google News RSS monitored for Rae Bareli / UP crisis keywords every 6 hours. Relevant alerts auto-create a "News Detected" card in Firestore. Admin can confirm or dismiss. Zero cost, completely free.

**B. IMD Weather Intelligence**
Open-Meteo rainfall forecast for Rae Bareli district. Heavy rain predicted → cross-references AIKosh flood-prone villages → auto-flags them as "Elevated Risk" on the map. Pure logic + real government data = predictive intelligence.

**C. OpenStreetMap Overpass API**
On every incoming report → nearest PHC, hospital, school, police station queried live. No PHC within 15km → severity auto-upgraded. Admin card shows "Nearest hospital: 23km."

---

### Layer 3 — User Generated Data
Field workers submit reports via voice (Hindi/English) or form. Gemini 2.0 Flash extracts category, location, severity, affected count automatically from speech. Photos attached to reports. All data PII-redacted before Firestore write (DPDP Act 2023 compliance). Real-time sync across all dashboards via `onSnapshot`.

**Gemini Vision on Photos** — uploaded photo sent to Gemini Vision → detects issue type, damage severity 1–10, recommended resources → pre-fills report form automatically.

---

###  Layer 4 — Intelligence Engine
FastAPI backend doing the heavy lifting:

**A. Village Context Enrichment**
Every incoming report is enriched with AIKosh static data + live Overpass infrastructure data before Gemini scoring. Severity scores cite real data — hospital distance, vulnerability score, population.

**B. Heuristic Volunteer Matching**
```
Score = (0.5 × Proximity) + (0.3 × SkillMatch) + (0.2 × Reliability)
```
- Proximity: OSRM distance from volunteer to village
- SkillMatch: Gemini compares need description to volunteer skill tags
- Reliability: resolved / total assigned (live from Firestore history)

Top 3 volunteers shown with score + reasoning. "Recommended" badge on best match.

**C. AI Priority Scoring**
Gemini ranks all active reports 1–100 by urgency. Factors: category (flood/medical highest), severity, affected count, village vulnerability score. Most critical issue always surfaces first.

**D. Survey / PDF Ingestion**
Admin uploads photo or PDF of paper NGO survey → Gemini Vision extracts structured data → admin confirms → saved as report → appears on map instantly, gets priority scored.

---

###  Layer 5 — Coordination Layer
Two-way communication between all roles:

**Volunteer Skill Profiles** — skill tags (Teaching, Medical, Legal Aid, Agriculture, Construction), languages spoken, availability, reliability score auto-calculated from task history.

**Community Needs Registry** — separate from emergencies. Chronic long-term needs (Education, Healthcare, Livelihood, Women Empowerment) tracked on a separate board. Pre-populated from AIKosh dropout/health data.

**Two-Way Request System** — field worker sees Gemini-ranked volunteer list → sends request → volunteer accepts/declines via Firestore `onSnapshot` notification → field worker sees response in real time. No FCM needed.

---

 Tech Stack
LayerTechnologyFrontendNext.js 14, React, TailwindDatabaseFirebase Firestore (real-time)AuthFirebase Authentication (Google OAuth)AI — SpeechGroq Whisper Large v3AI — Extraction & ScoringGoogle Gemini 2.0 FlashBackendFastAPI (Python)Hosting — FrontendVercelHosting — BackendGoogle Cloud RunMapsLeaflet.js + Google MapsRoutingOSRM (Open Source Routing Machine)ChartsRechartsPDFjsPDF + jspdf-autotableDataAIKosh (Government of India)

 Running Locally
Prerequisites

Node.js 18+
Python 3.11+
Firebase project
Gemini API key
Groq API key



