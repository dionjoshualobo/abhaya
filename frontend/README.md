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

## Copilot Agent Prompt — Paste This To Get Started

Copy and paste the following as your first message to the Copilot agent:

---

I am building the React Native frontend for **Abhaya**, a women's safety app. Here is everything you need to know before we start.

**Tech stack:** React Native, Expo SDK 55, Expo Router (file-based routing), expo-sensors (accelerometer), React Native Maps, AsyncStorage, axios.

**Project structure:**
- `frontend/app/` — all screens (Expo Router)
- `frontend/services/api.ts` — ALL backend API calls go here and only here
- `frontend/components/` — reusable UI components
- `app.json`, `package.json`, `tsconfig.json` — at repo root

**App flow:**
The app opens looking exactly like a basic calculator. When the user types the code `2580=` it unlocks the real app. The real home screen has a large SOS panic button, and quick action buttons: Fake Call, Emergency Contacts, Map/Heatmap, Safety Tips.

**Backend:** Flask API running at `EXPO_PUBLIC_API_URL` (set in `.env` at repo root). Do not call it directly from screens — only through `frontend/services/api.ts`.

**Emergency contacts** are stored locally on the device using AsyncStorage. No backend needed for contacts.

**Rules you must follow:**
- All backend API calls go through `frontend/services/api.ts` only. Never call axios or fetch directly from a screen.
- Never hardcode API keys, URLs, or secrets. Use `.env` with `EXPO_PUBLIC_` prefix.
- Never touch anything in `backend/`.
- One screen/feature at a time. Do not move to the next until the current one works.
- Never install a package without telling me first.

**Backend API reference:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/alert` | Send SOS SMS alert with location |
| GET | `/heatmap` | Get danger zone heatmap data |
| POST | `/heatmap` | Report a dangerous location |
| POST | `/anomaly` | Report accelerometer anomaly data |

**Your first task:**
Build the **calculator disguise screen** (`frontend/app/index.tsx`). It should:
1. Look like a real, functional basic calculator (addition, subtraction, multiplication, division)
2. When the user types `2580=` instead of a math expression, navigate to `frontend/app/home.tsx` (create a placeholder screen for now)
3. The calculator must work normally for all other inputs
4. Clean, minimal dark UI — black background, white/grey buttons, red for the secret unlock button (=)

Start with this screen only. Show me the plan before writing any code.
