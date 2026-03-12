# Abhaya — Frontend

## Setup

```bash
npm install
npx expo start
```

## Folder Structure

```
frontend/
├── app/           # Expo Router screens (file-based routing)
├── services/      # All backend API calls — only edit api.ts
├── components/    # Reusable UI components
```

## Rules

- **All backend API calls go through `services/api.ts` only.**
- Never hardcode API keys — use `.env` file.
- Create a `.env` file at the project root:

```
EXPO_PUBLIC_API_URL=http://<backend-machine-ip>:5000
```

## Backend API

The backend runs at `http://localhost:5000` (or the IP in your `.env`).

| Method | Endpoint    | Description         |
|--------|-------------|---------------------|
| GET    | `/health`   | Health check        |
| POST   | `/alert`    | Send SOS alert      |
| GET    | `/heatmap`  | Get danger heatmap  |
| POST   | `/anomaly`  | Report anomaly      |
