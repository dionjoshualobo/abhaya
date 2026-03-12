# 🔍 Abhaya Code Audit Report

## Critical Issues Found

### 1. ❌ THRESHOLD MISMATCH (BLOCKING)
**Severity: CRITICAL**

- **Frontend**: `dashboard.tsx` line 21
  ```tsx
  const SHAKE_THRESHOLD = 8.0;  // ❌ WRONG!
  ```
- **Backend**: `anomaly.py` line 12
  ```python
  ANOMALY_THRESHOLD = 5.0  # ✅ Correct
  ```
- **Background**: `backgroundMotion.ts` line 12
  ```typescript
  const SHAKE_THRESHOLD = 5.0;  // ✅ Correct
  ```

**Impact**: Frontend dashboard requires magnitude 8.0 to trigger, but background motion detection is 5.0. This is why shake detection via background service might work but manual shake on dashboard doesn't!

**Fix**: Change dashboard threshold to 5.0

---

### 2. ❌ HARDCODED API_URL IN BACKGROUND SERVICE
**Severity: HIGH**

- **File**: `backgroundMotion.ts` line 13
  ```typescript
  const API_URL = 'http://10.0.2.2:5000'; // Android emulator, not device!
  ```

**Impact**: When running on physical device (which you are via ADB), this hardcoded emulator IP won't work. The background service will fail silently.

**Fix**: Import API_URL from `frontend/services/api.ts` or use `process.env.EXPO_PUBLIC_API_URL`

---

### 3. ❌ NO ERROR FEEDBACK TO USER
**Severity: HIGH**

**Locations**:
- `dashboard.tsx` line 73: Try-catch logs to console but no user alert on error
- `backgroundMotion.ts` line 61: Try-catch logs to console but no notification

**Impact**: If SMS fails or API is down, user gets zero feedback. They think SOS was sent when it wasn't.

**Fix**: Add Toast/Alert notifications for:
- "Shake detected..."
- "Sending SOS..."
- "SOS sent to {contact_name}" ✅
- "ERROR: Failed to send SOS" ❌
- Network errors

---

### 4. ❌ SMS SUCCESS LOGIC IS INVERTED
**Severity: HIGH**

- **File**: `backend/routes/anomaly.py` lines 104-105
  ```python
  'alert_sent': contact_name is not None and sms_result is not None,
  ```

**Problem**: `sms_result` comes from `send_sms()` but might be truthy even if SMS failed. Need to check actual SMS API response.

**Impact**: Frontend might show "SOS Sent" when SMS actually failed silently.

---

### 5. ⚠️ NO USER-VISIBLE LOGGING
**Severity: MEDIUM**

All logs go to console only:
- `console.log('[motion] shake detected...')` - User can't see
- `console.log('[anomaly] SMS sent...')` - User can't see
- `console.log('[bg-motion] report failed...')` - User can't see

**Impact**: Users have no way to debug. "Did the SOS send?" "Why didn't SMS arrive?"

**Fix**: Add Toast notifications or in-app debug log display

---

### 6. ⚠️ NO LOCATION FALLBACK
**Severity: MEDIUM**

- **Files**: `dashboard.tsx` lines 56-61, `backgroundMotion.ts` lines 51-57
  ```typescript
  if (status === 'granted') {
    const loc = await Location.getCurrentPositionAsync({});
    lat = loc.coords.latitude;
    lng = loc.coords.longitude;
  }
  // If denied, lat=0 and lng=0 are sent to backend silently
  ```

**Impact**: If location permission is denied, SOS is sent with 0,0 coordinates (Null Island, Atlantic Ocean). Backend doesn't validate this.

**Fix**: Add validation in frontend and backend to warn user or request permission

---

### 7. ⚠️ BACKGROUND SERVICE USES GLOBAL STATE
**Severity: MEDIUM**

- **File**: `backgroundMotion.ts` lines 15-17
  ```typescript
  let accelerometerSubscription: any = null;
  let lastAnomalyTime = 0;
  const COOLDOWN_MS = 120000;
  ```

**Problem**: If background service is started twice, subscriptions leak. No cleanup.

**Impact**: Memory leak, accelerometer listener duplicated, multiple SMS alerts sent

---

### 8. ⚠️ MISSING RESPONSE FIELD HANDLING
**Severity: MEDIUM**

- **File**: `dashboard.tsx` line 68
  ```typescript
  if (res.data.alert_sent) {
  ```

**Problem**: If backend returns error or unexpected structure, `alert_sent` is undefined, if check fails silently, user gets no feedback.

**Fix**: Add validation: `res.data?.alert_sent === true`

---

### 9. ⚠️ CONTACTS NOT VALIDATED ON ADD
**Severity: LOW**

- **Files**: `backend/routes/contacts.py`, `frontend/screens/contacts.tsx`

**Problem**: No phone number format validation (should be E.164 format for SMS)

**Impact**: Invalid phone numbers silently fail to send SMS

---

### 10. ⚠️ NO RATE LIMITING ON /ANOMALY
**Severity: LOW**

- **File**: `backend/routes/anomaly.py` lines 62-79

**Problem**: Cooldown is 120s but only checked after anomaly detected. User could spam /anomaly endpoint from multiple devices.

**Impact**: DoS risk, excessive SMS sent

---

## Implementation Checklist

### Phase 1: Fix Critical Bugs (DO THIS NOW)
- [ ] Change `dashboard.tsx` SHAKE_THRESHOLD from 8.0 to 5.0
- [ ] Fix `backgroundMotion.ts` to use correct API_URL from env
- [ ] Add error Alert when reportAnomaly fails
- [ ] Add error logging in backgroundMotion catch block

### Phase 2: Add User Feedback (DO THIS TODAY)
- [ ] Install React Native Toast library
- [ ] Add Toast notifications:
  - "🫨 Shake detected! Sending SOS..."
  - "✅ SOS sent to {contact_name}"
  - "❌ Failed to send SOS: {error}"
  - "❌ No emergency contacts saved"
- [ ] Show contact list when no contacts exist
- [ ] Show location permission status in UI

### Phase 3: Validate & Debug (DO THIS BEFORE APK)
- [ ] Add in-app debug panel (long-press to show last 10 events)
- [ ] Validate SMS response from Twilio
- [ ] Test end-to-end on physical device
- [ ] Monitor backend logs during test
- [ ] Verify background motion detection works

### Phase 4: Polish (BEFORE RELEASE)
- [ ] Add phone number format validation
- [ ] Implement proper error recovery
- [ ] Add rate limiting on /anomaly
- [ ] Test with multiple contacts
- [ ] Test SMS delivery with real carriers

---

## Code Quality Summary

| Category | Status | Notes |
|----------|--------|-------|
| Linting | ✅ PASS | ESLint 0 errors |
| Type Safety | ⚠️ WARN | Some `any` types, missing null checks |
| Error Handling | ❌ FAIL | No user feedback on errors |
| Logging | ⚠️ WARN | Console-only, not user-visible |
| Testing | ❓ UNKNOWN | No automated tests |
| Documentation | ✅ PASS | Code comments adequate |
| Security | ⚠️ WARN | No rate limiting, phone validation missing |
| Performance | ✅ PASS | Efficient accelerometer updates |

---

## Next Steps

1. **Immediately**: Fix threshold mismatch (8.0 → 5.0)
2. **Immediately**: Fix API_URL in background service
3. **Today**: Add Toast notifications for user feedback
4. **Today**: Test on physical device with debug logs
5. **Before APK**: Implement error recovery + validation

---

Generated: $(date)
