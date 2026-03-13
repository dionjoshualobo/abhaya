# Abhaya — Women's Safety App

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

**Abhaya** is a comprehensive mobile safety application built with Expo, React Native, and a Flask backend. It is designed to provide rapid SOS activation, automatic alerting, and location-aware safety workflows to empower personal security.

---

## Table of Contents
- [Core Capabilities](#core-capabilities)
- [High-Level Architecture](#high-level-architecture)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Key API Routes](#key-api-routes)
- [Important Workflows](#important-workflows)
- [Security Notes](#security-notes)

---

## Core Capabilities

- **Manual SOS:** One-tap emergency alert to your saved contacts.
- **Voice SOS:** Press the volume-down button, speak a configured code word, and automatically trigger an alert.
- **Shake/Anomaly SOS:** Detects high accelerometer activity (like shaking) and auto-triggers an SOS (with a cooldown to prevent false alarms).
- **Live Tracking Links:** SMS alerts include a live tracking URL that updates periodically with your precise location.
- **Transport Safety Alert:** Share vehicle details (plate, driver, route) and personal notes with your trusted contacts.
- **Contact & Place Management:** Easily manage emergency contacts and designate "safe places".
- **Heatmap & Check-in:** View danger reports on a map and utilize check-in escalation workflows if you fail to check-in on time.

---

## High-Level Architecture

### Frontend (React Native / Expo)
- **Routing:** Screen routing is handled via Expo Router (`app/`).
- **Networking:** API calls are centralized in `frontend/services/api.ts`.
- **Device Integrations:**
  - Location tracking using `expo-location`.
  - Accelerometer monitoring using `expo-sensors`.
  - Native voice recognition integrated with volume button hardware triggers.

### Backend (Flask)
- **API Endpoints:** REST APIs are organized in `backend/routes/`.
- **Database:** SQLite models managed via SQLAlchemy (`backend/models.py`).
- **Services:**
  - SMS delivery service (`backend/services/sms_service.py`) via Twilio.
  - Live tracking session management (`backend/services/live_tracking_service.py`).

---

## Repository Layout

```text
abhaya/
├── app/                          # Mobile screens (Expo Router)
├── frontend/services/api.ts      # API client used by all screens
├── backend/
│   ├── app.py                    # Flask bootstrap + route registration
│   ├── models.py                 # DB models
│   ├── routes/                   # REST endpoints
│   └── services/                 # SMS, tracking, helper services
├── android/                      # Android native project
├── ios/                          # iOS native project
└── README.md                     # You are here!
```

---

## Tech Stack

- **Frontend:** React Native, Expo, Expo Router, TypeScript
- **Backend:** Python, Flask, SQLAlchemy
- **Database:** SQLite
- **Messaging:** Twilio SMS API
- **Maps / Tracking:** Google Maps URLs, Expo Location

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://python.org/) (v3.10+)
- Android SDK + `adb` (for Android development)
- A physical Android device or an emulator

### 1. Environment Setup

Create or update the `.env` file in the `backend/` directory:

```dotenv
# backend/.env
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_DATABASE_URL=your_firebase_url
BACKEND_PUBLIC_BASE_URL=your_public_backend_url
```
> **Important:** `BACKEND_PUBLIC_BASE_URL` should be a publicly reachable URL (e.g., using ngrok) for live tracking links in SMS. **Never commit real secrets to version control.**

### 2. Local Development

**Install Dependencies:**
```zsh
npm install
```

**Start the Backend:**
```zsh
cd backend
python app.py
```

**Start the App (Dev Client):**
Open a new terminal window:
```zsh
npx expo start --dev-client --clear
```

**Device USB Reverse Proxy & Launch (Android):**
If testing on a physical Android device via USB:
```zsh
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000
adb shell monkey -p com.anonymous.abhaya -c android.intent.category.LAUNCHER 1
```

---

## Key API Routes

#### Core System
- `GET /health` - Health check

#### Emergency & Alerts
- `POST /alert` - Trigger manual SOS
- `POST /anomaly` - Trigger shake/anomaly SOS
- `POST /transport/notify` - Send transport details

#### Users & Preferences
- `GET | POST | PUT | DELETE /contacts` - Manage emergency contacts
- `GET | POST | PUT | DELETE /places` - Manage safe places

#### Workflows
- `GET | POST /heatmap` - Danger reports heatmap
- `POST /checkin/request` - Initiate check-in
- `POST /checkin/respond` - Respond safely
- `POST /checkin/poll` - Poll check-in status

#### Tracking Sessions
- `POST /tracking/start` - Start live session
- `POST /tracking/update` - Push new location
- `POST /tracking/stop` - End session
- `GET /tracking/<token>` - Get tracking config
- `GET /tracking/view/<token>` - View live web map

---

## Important Workflows

### Transport Alert Flow
When a user submits transport details (e.g., in a cab or bus):
1. App captures current location.
2. Backend creates a secure live tracking session.
3. SMS is dispatched to emergency contacts containing the transport fields, location, map link, and live tracking URL.
4. App continuously pushes periodic location updates to the active tracking session.

### Voice SOS Flow
For discreet emergency activation:
1. User presses the **volume-down** physical key.
2. App opens a brief, hidden voice listening window.
3. Speech text is transcribed, normalized, and compared against configured code words.
4. Upon a match, SOS is immediately sent with live tracking metadata.

---

## Security Notes

- **Secret Management:** Rotate exposed credentials immediately if they are ever committed or shared. Use environment-based secret management for production.
- **Network Security:** Always use `HTTPS` for public or live-tracking URLs to protect location data in transit.
- **Operation:** All frontend network calls must route cleanly through `frontend/services/api.ts`. The default backend dev URL is `http://localhost:5000`.

---
*Stay safe with Abhaya.*
