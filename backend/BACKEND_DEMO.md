# Abhaya — Backend Demo Guide

## Start the Server

```bash
cd /home/dion/abhaya/backend
source venv/bin/activate
python app.py
```

Server runs at: **http://localhost:5000**

---

## Features & curl Commands

> Replace `+91XXXXXXXXXX` with your actual verified Twilio recipient number.
> Run each command in a separate terminal tab while the server is running.

---

### 1. Health Check
Confirms the server is alive.

```bash
curl http://localhost:5000/health
```
**Expected:**
```json
{"status": "ok"}
```

---

### 2. Emergency Contacts

**Add a contact:**
```bash
curl -X POST http://localhost:5000/contacts \
  -H "Content-Type: application/json" \
  -d '{"name": "Mum", "phone": "+91XXXXXXXXXX", "relation": "Mother"}'
```

**List all contacts:**
```bash
curl http://localhost:5000/contacts
```

**Update a contact (replace 1 with actual ID):**
```bash
curl -X PUT http://localhost:5000/contacts/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Mum Updated", "phone": "+91XXXXXXXXXX", "relation": "Mother"}'
```

**Delete a contact (replace 1 with actual ID):**
```bash
curl -X DELETE http://localhost:5000/contacts/1
```

---

### 3. SOS Alert — Twilio SMS + Gemini AI Message
Sends a real SMS to all saved contacts (or contacts in the body).
Gemini AI generates the message text. Falls back to a default message if Gemini is unavailable.

```bash
curl -X POST http://localhost:5000/alert \
  -H "Content-Type: application/json" \
  -d '{"latitude": 12.9716, "longitude": 77.5946}'
```
**Expected:**
```json
{
  "status": "sent",
  "message_sent": "URGENT: Abhaya alert...",
  "recipients": 1
}
```
> ✅ Check SMS on the registered phone. May land in spam — check there too.

You can also pass contacts directly (bypasses DB):
```bash
curl -X POST http://localhost:5000/alert \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.9716,
    "longitude": 77.5946,
    "contacts": [{"name": "Test", "phone": "+91XXXXXXXXXX"}]
  }'
```

---

### 4. Safe Places

**Add a safe place:**
```bash
curl -X POST http://localhost:5000/places \
  -H "Content-Type: application/json" \
  -d '{"label": "Home", "latitude": 12.9716, "longitude": 77.5946, "radius_meters": 200}'
```

**List all safe places:**
```bash
curl http://localhost:5000/places
```

**Update a place (replace 1 with actual ID):**
```bash
curl -X PUT http://localhost:5000/places/1 \
  -H "Content-Type: application/json" \
  -d '{"label": "Home Updated", "latitude": 12.9716, "longitude": 77.5946, "radius_meters": 300}'
```

**Delete a place:**
```bash
curl -X DELETE http://localhost:5000/places/1
```

---

### 5. Location Safety Check
Checks if given coordinates are near any saved safe place using Haversine distance.
Returns `safe` if within radius, `suspicious` if not.

```bash
curl -X POST http://localhost:5000/location/check \
  -H "Content-Type: application/json" \
  -d '{"latitude": 12.9716, "longitude": 77.5946}'
```
**Expected (if near a saved place):**
```json
{
  "status": "safe",
  "nearest_place": "Home",
  "distance_meters": 12.4
}
```
**Expected (if far from all places):**
```json
{
  "status": "suspicious",
  "nearest_place": "Home",
  "distance_meters": 4823.1
}
```

---

### 6. Anomaly Detection (Shake / Attack)
Receives accelerometer x/y/z values. Calculates magnitude.
If magnitude ≥ 25.0 → triggers SOS SMS automatically.
120-second cooldown prevents duplicate alerts.

**Trigger an anomaly (high magnitude = attack/shake):**
```bash
curl -X POST http://localhost:5000/anomaly \
  -H "Content-Type: application/json" \
  -d '{"x": 15.0, "y": 12.0, "z": 8.0, "latitude": 12.9716, "longitude": 77.5946}'
```
**Expected (anomaly triggered, SMS sent):**
```json
{
  "anomaly_detected": true,
  "magnitude": 20.56,
  "alert_sent": true
}
```

**Normal movement (below threshold, no alert):**
```bash
curl -X POST http://localhost:5000/anomaly \
  -H "Content-Type: application/json" \
  -d '{"x": 0.5, "y": 0.3, "z": 9.8, "latitude": 12.9716, "longitude": 77.5946}'
```
**Expected:**
```json
{
  "anomaly_detected": false,
  "magnitude": 9.83,
  "alert_sent": false
}
```

**Test cooldown (run the high-magnitude command twice within 2 minutes):**
Second call returns:
```json
{
  "anomaly_detected": true,
  "alert_sent": false,
  "cooldown_active": true,
  "retry_in_seconds": 97
}
```

---

### 7. Check-in Flow
Used when a user enters a suspicious area. Backend tracks the session.
If user doesn't respond in time → auto-triggers SOS.

**Step 1 — Start a check-in (save the session_id from response):**
```bash
curl -X POST http://localhost:5000/checkin/request \
  -H "Content-Type: application/json" \
  -d '{"latitude": 12.9716, "longitude": 77.5946, "timeout_seconds": 30}'
```
**Expected:**
```json
{
  "status": "checkin_pending",
  "session_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "message": "Are you okay? Respond within the timeout or an alert will be sent.",
  "timeout_seconds": 30
}
```

**Step 2a — User responds safe (replace SESSION_ID):**
```bash
curl -X POST http://localhost:5000/checkin/respond \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID", "safe": true}'
```

**Step 2b — User responds NOT safe:**
```bash
curl -X POST http://localhost:5000/checkin/respond \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID", "safe": false}'
```

**Step 3 — Poll status (to demo auto-SOS on timeout, wait 30s then poll):**
```bash
curl -X POST http://localhost:5000/checkin/poll \
  -H "Content-Type: application/json" \
  -d '{"session_id": "SESSION_ID"}'
```
**Expected after timeout (no response → auto-SOS):**
```json
{
  "status": "alert_sent",
  "message": "No response received. SOS alert triggered.",
  "police_notified": true
}
```

---

### 8. Danger Heatmap

**Submit a danger zone report:**
```bash
curl -X POST http://localhost:5000/heatmap \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 12.9716,
    "longitude": 77.5946,
    "description": "Felt followed near this area",
    "weight": 3.5
  }'
```
> `weight` is 0.1–5.0, higher = more dangerous

**Get all heatmap points:**
```bash
curl http://localhost:5000/heatmap
```
**Expected:**
```json
{
  "count": 1,
  "points": [{"latitude": 12.9716, "longitude": 77.5946, "weight": 3.5}],
  "reports": [...]
}
```

**Delete a report (replace 1 with actual ID):**
```bash
curl -X DELETE http://localhost:5000/heatmap/1
```

---

## Demo Flow (Recommended Order)

1. **Health check** → server is running
2. **Add contact** → show it saved
3. **List contacts** → confirm
4. **SOS Alert** → show real SMS arriving on phone ⭐
5. **Add safe place** → add "College" or "Home"
6. **Location check** → pass coordinates inside radius → `safe`
7. **Location check** → pass far-away coordinates → `suspicious`
8. **Anomaly (low)** → normal movement, no alert
9. **Anomaly (high)** → shake detected, SMS sent ⭐
10. **Anomaly (high again)** → cooldown blocks it, show `retry_in_seconds`
11. **Check-in request** → start 30s session
12. **Wait 30 seconds** → then poll → auto-SOS fires ⭐
13. **Report heatmap** → submit danger zone
14. **Get heatmap** → show points array ready for map overlay

---

## Notes

- SMS will arrive from a US number (+1 334...) — may land in **spam/junk**, check there
- Police notification in check-in is **faked** (`police_notified: true`) — SMS to contacts is real
- Twilio free trial only sends to **verified numbers** — the registered number in `.env` works
- Gemini generates a custom AI message for each SOS — if API is down, a fallback message is used
