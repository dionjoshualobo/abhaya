# Abhaya — Frontend

React Native + Expo app for Abhaya, a women's safety app with passive anomaly detection, SOS alerts, and a danger heatmap disguised as a calculator.

## Your Role

You are building the **frontend only**. The backend is a separate Flask API — you do not touch the `backend/` folder.

## Setup

**1. Install dependencies (run from repo root):**
```bash
npm install
```

**2. Create a `.env` file at the repo root:**
```
EXPO_PUBLIC_API_URL=http://<backend-ip>:5000
```
> Ask the backend team for their machine's local IP.

**3. Start the app:**
```bash
npx expo start
```
Scan the QR code with the Expo Go app on your phone, or press `a` for Android emulator.

## Folder Structure

```
frontend/
├── app/           # Screens — Expo Router file-based routing
│   ├── _layout.tsx       # Root layout
│   └── index.tsx         # Home screen
├── services/
│   └── api.ts     # ← ALL backend API calls go here and ONLY here
├── components/    # Reusable UI components
└── assets/        # Images, icons, splash
```

## Critical Rules

- **Never call the backend directly from a screen.** Always use `frontend/services/api.ts`.
- **Never hardcode API keys or URLs.** Use `.env` with `EXPO_PUBLIC_` prefix.
- **Never modify anything in `backend/`.**
- One feature at a time. Do not start a new screen until the current one works.

## API Reference

All endpoints are on `EXPO_PUBLIC_API_URL` (default: `http://localhost:5000`).

| Method | Endpoint    | Description              |
|--------|-------------|--------------------------|
| GET    | `/health`   | Health check             |
| POST   | `/alert`    | Send SOS alert via SMS   |
| GET    | `/heatmap`  | Fetch danger heatmap data|
| POST   | `/anomaly`  | Report accelerometer anomaly |

Stubs for all these are already in `frontend/services/api.ts` — just uncomment and type them as needed.

## Copilot Agent Starter Prompt

> I am building the React Native frontend for a women's safety app called Abhaya.
> The project uses Expo Router for navigation. All backend calls go through `frontend/services/api.ts` only.
> The backend is Flask running at the URL in `EXPO_PUBLIC_API_URL`.
> My current task is: [describe your task here]
