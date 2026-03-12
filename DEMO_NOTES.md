# Abhaya — Demo Notes

## What Happened with Integration

We tried merging `feature/backend` + `frontend` into an `integration` branch and wiring up the API calls. The frontend screens loaded correctly in isolation (on the `frontend` branch) but after the merge the app got stuck on the dashboard showing a "Coming Soon" screen — most likely a routing conflict introduced during the merge (expo-router picks up extra/conflicting screen files or a layout mismatch).

**Root cause (likely):** The `integration` branch has a stale or conflicted `app/_layout.tsx` that doesn't match what the `frontend` branch was using. The merge brought in backend files fine but the screen navigation broke.

**Don't fix this now — demo separately.**

---

## Demo Plan: Show Backend + Frontend Separately

### 1. Backend Demo (Postman / curl)

Run the Flask server:
```bash
cd /home/dion/abhaya/backend
source venv/bin/activate
python app.py
```
Server runs at `http://localhost:5000`

**Endpoints to demo:**

| Feature | Method | URL | Body |
|---|---|---|---|
| Health | GET | /health | — |
| Add contact | POST | /contacts | `{"name":"Test","phone":"+91XXXXXXXXXX","relation":"Friend"}` |
| List contacts | GET | /contacts | — |
| SOS Alert (SMS) | POST | /alert | `{"latitude":12.9716,"longitude":77.5946}` |
| Report anomaly | POST | /anomaly | `{"x":15.0,"y":12.0,"z":8.0,"latitude":12.9716,"longitude":77.5946}` |
| Add safe place | POST | /places | `{"name":"Home","latitude":12.97,"longitude":77.59,"radius_meters":200}` |
| Location check | POST | /location/check | `{"latitude":12.97,"longitude":77.59}` |
| Check-in flow | POST | /checkin/request | `{"phone":"+91XXXXXXXXXX","timeout_seconds":30}` |
| Heatmap data | GET | /heatmap | — |
| Report danger | POST | /heatmap | `{"latitude":12.9716,"longitude":77.5946,"description":"Unsafe area","weight":3.5}` |

**Key things to highlight:**
- SOS sends a real Twilio SMS to the registered number
- Gemini AI generates the SOS message text
- Anomaly has 120-second cooldown to prevent spam
- Check-in auto-triggers SOS if no response in timeout window

---

### 2. Frontend Demo (run on `frontend` branch — THIS IS THE WORKING ONE)

```bash
cd /home/dion/abhaya
git checkout frontend
npx expo start --clear
```

Scan QR with Expo Go app.

**Screens to show:**
1. **Calculator** (disguise UI) — type `2580=` to unlock
2. **Login/Onboarding** — enter name + phone
3. **Fake OTP** — any 6 digits work
4. **Dashboard** — SOS pulsing button (no backend in this demo, just UI)
5. **Settings** — toggles for vibration, location, notifications, auto-alert, stealth mode
6. **Profile** — emergency contact form

---

## What Is Built (Complete)

### Backend ✅
- GET /health
- POST /alert — Twilio SMS + Gemini AI message
- GET/POST/PUT/DELETE /contacts
- GET/POST/PUT/DELETE /places
- POST /location/check (Haversine distance)
- POST /anomaly (threshold 25.0g, cooldown 120s, auto-SOS)
- POST /checkin/request, /respond, /poll (auto-SOS on timeout)
- GET/POST/DELETE /heatmap (with weight 0.1–5.0)

### Frontend ✅ (on `frontend` branch)
- Calculator disguise screen (code: `2580=`)
- Login / OTP / Dashboard / Settings / Profile screens
- SOS pulsing animation
- Navigation working

---

## What Is NOT Built

- ❌ Shake detection (expo-sensors accelerometer → POST /anomaly)
- ❌ Heatmap screen (react-native-maps with danger zone overlay)
- ❌ Settings toggles wired to any storage
- ❌ Planned route + deviation alerts
- ❌ Firebase nearby-user alerts

---

## After Demo — Fix Integration

To fix the `integration` branch properly after the demo:

1. Start fresh from `frontend` branch
2. Cherry-pick only the API wiring commits from `integration`
3. Fix `_layout.tsx` to match frontend's working version exactly
4. Test each screen one by one before committing

Key file to check: `app/_layout.tsx` — the frontend branch version is the source of truth for routing.
