# Abhaya — Women’s Safety App

Abhaya is a mobile safety app built with Expo + React Native and a Flask backend. It focuses on rapid SOS activation, automatic alerting, and location-aware safety workflows.

## Core Capabilities

- **Manual SOS:** One-tap emergency alert to saved contacts.
- **Voice SOS:** Press volume-down, listen briefly, match configured code words, and trigger alert.
- **Shake/Anomaly SOS:** Detect high accelerometer activity and auto-trigger SOS with cooldown.
- **Live Tracking Links:** SMS includes a live tracking URL that updates periodically.
- **Transport Safety Alert:** Share vehicle, plate, driver, route, and notes with contacts.
- **Contact & Place Management:** Save emergency contacts and safe places.
- **Heatmap & Check-in:** Danger reports and check-in escalation workflows.

## High-Level Architecture

### Frontend (React Native / Expo)
- Screen routing via Expo Router (`app/`)
- API calls centralized in `frontend/services/api.ts`
- Device integrations:
	- Location (`expo-location`)
	- Accelerometer (`expo-sensors`)
	- Voice recognition + volume trigger

### Backend (Flask)
- REST APIs in `backend/routes/`
- SQLite models via SQLAlchemy (`backend/models.py`)
- SMS delivery service (`backend/services/sms_service.py`)
- Live tracking session management (`backend/services/live_tracking_service.py`)

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
└── README.md
```

## Tech Stack

- **Frontend:** React Native, Expo, Expo Router, TypeScript
- **Backend:** Flask, SQLAlchemy
- **Messaging:** Twilio SMS
- **Location Links:** Google Maps URLs

## Prerequisites

- Node.js 18+
- Python 3.10+
- Android SDK + `adb`
- Physical Android device or emulator

## Environment Variables

Create/update `backend/.env`:

```dotenv
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
GEMINI_API_KEY=...
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_DATABASE_URL=
BACKEND_PUBLIC_BASE_URL=
```

### Important
- `BACKEND_PUBLIC_BASE_URL` should be a publicly reachable URL (for live tracking links in SMS).
- Do not commit real secrets.

## Local Development

### 1) Install dependencies

```zsh
cd /home/dion/abhaya
npm install
```

### 2) Start backend

```zsh
cd /home/dion/abhaya/backend
python app.py
```

### 3) Start app (dev client)

```zsh
cd /home/dion/abhaya
npx expo start --dev-client --clear
```

### 4) Device USB reverse + launch

```zsh
cd /home/dion/abhaya
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000
adb shell monkey -p com.anonymous.abhaya -c android.intent.category.LAUNCHER 1
```

## Key API Routes

- `GET /health`
- `POST /alert`
- `POST /anomaly`
- `GET|POST|PUT|DELETE /contacts`
- `GET|POST|PUT|DELETE /places`
- `GET|POST /heatmap`
- `POST /checkin/request`
- `POST /checkin/respond`
- `POST /checkin/poll`
- `POST /tracking/start`
- `POST /tracking/update`
- `POST /tracking/stop`
- `GET /tracking/<token>`
- `GET /tracking/view/<token>`
- `POST /transport/notify`

## Transport Alert Flow

When a user submits transport details:

1. App captures current location.
2. Backend creates a live tracking session.
3. SMS is sent to emergency contacts with only provided transport fields.
4. SMS includes location, map link, and live tracking URL.
5. App pushes periodic location updates to the live tracking session.

## Voice SOS Flow

1. User presses volume-down key.
2. App opens a short voice listening window.
3. Speech text is normalized and compared with configured code words.
4. On match, SOS is sent with live tracking metadata.

## Operational Notes

- All frontend network calls must go through `frontend/services/api.ts`.
- Backend default dev URL is `http://localhost:5000`.
- For physical device testing with USB, use `adb reverse` as shown above.

## Security Notes

- Rotate exposed credentials immediately if they were ever committed or shared.
- Use environment-based secret management for production.
- Use HTTPS for public/live-tracking URLs.
