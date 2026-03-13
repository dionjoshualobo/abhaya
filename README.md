# Abhaya — Women’s Safety App

Abhaya is a React Native + Flask safety app with SOS workflows, anomaly-based alerts, emergency contact messaging, transport safety sharing, and live location tracking.

## Features

- Manual SOS alert with live tracking link
- Voice SOS (volume-down trigger + code words)
- Shake/anomaly-triggered SOS with cooldown
- Emergency contact management
- Safe places + danger heatmap
- Check-in flow with timeout handling
- Transport safety alert (vehicle/driver/trip details + live tracking)

## Tech Stack

- Frontend: React Native, Expo, Expo Router, TypeScript
- Backend: Flask, SQLAlchemy, Twilio
- Integrations: Google Maps links, optional Firebase/Gemini hooks

## Project Structure

```text
abhaya/
├── app/                        # Expo Router screens
├── frontend/services/api.ts    # All frontend API calls (single source)
├── backend/
│   ├── app.py                  # Flask entrypoint
│   ├── models.py               # DB models
│   ├── routes/                 # API endpoints
│   └── services/               # SMS + live tracking helpers
├── android/                    # Native Android project (prebuild)
└── README.md
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- Android device or emulator
- ADB installed and available in PATH

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

`BACKEND_PUBLIC_BASE_URL` is required for live-tracking links in SMS to be reachable externally. During development, set this to a public tunnel URL (for example, ngrok).

## Install

```zsh
cd /home/dion/abhaya
npm install
```

## Run (Development)

1) Start backend:

```zsh
cd /home/dion/abhaya/backend
python app.py
```

2) Start Expo dev client:

```zsh
cd /home/dion/abhaya
npx expo start --dev-client --clear
```

3) USB reverse + launch app:

```zsh
cd /home/dion/abhaya
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5000 tcp:5000
adb shell monkey -p com.anonymous.abhaya -c android.intent.category.LAUNCHER 1
```

## Transport Safety Flow

The Transport screen collects optional trip details:

- Vehicle
- Plate number
- Driver name
- From and To locations
- Additional notes

When submitted:

1. Backend creates a live tracking session.
2. SMS is sent to all emergency contacts with only filled transport fields.
3. SMS includes current location + Google Maps link + live tracking URL.
4. App pushes location updates every 15s (auto-stop after 10 minutes unless stopped earlier).

## Live Tracking Endpoints

- `POST /tracking/start`
- `POST /tracking/update`
- `POST /tracking/stop`
- `GET /tracking/<token>`
- `GET /tracking/view/<token>`

## Notes

- All frontend API requests go through `frontend/services/api.ts`.
- Do not commit secret values in `.env` to source control.
- For production, use HTTPS backend URLs and secure secret management.
