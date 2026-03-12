# Abhaya — Women's Safety App

A women's safety app with passive anomaly detection, SOS alerts, and a danger heatmap, disguised as a calculator.

## Project Structure

```
abhaya/
├── frontend/          # React Native + Expo (Expo Router)
│   ├── app/           # Screens (file-based routing)
│   ├── services/      # All API calls → api.ts
│   ├── components/    # Reusable UI components
│   └── assets/        # Images, icons
├── backend/           # Python Flask API
│   ├── app.py         # Entry point
│   ├── config.py      # API key config
│   ├── routes/        # alert.py, heatmap.py, anomaly.py
│   └── services/      # twilio_service.py, gemini_service.py, firebase_service.py
├── app.json           # Expo config
├── package.json       # Frontend dependencies
└── tsconfig.json      # TypeScript config
```

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React Native, Expo, Expo Router, Firebase Realtime DB, React Native Maps |
| Backend  | Flask, Twilio (SMS), Gemini API, Firebase Admin SDK |

## Team

- **Backend** → see `backend/` folder
- **Frontend** → see `frontend/README.md` for full setup instructions

## Rules

- All frontend API calls go through `frontend/services/api.ts` only.
- Never hardcode API keys — always use `.env` files.
- Backend runs at `http://localhost:5000` during development.
