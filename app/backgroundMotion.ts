/**
 * Background Motion Detection Service
 * Detects shake anomalies using AppState listener
 * Keeps accelerometer active even when app goes to background
 */

import { AppState, AppStateStatus } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import axios from 'axios';

const SHAKE_THRESHOLD = 5.0;
const API_URL = 'http://10.0.2.2:5000'; // Android emulator localhost, change to your IP for real device

let appState = 'active';
let accelerometerSubscription: any = null;
let lastAnomalyTime = 0;
const COOLDOWN_MS = 120000; // 120 seconds

/**
 * Start continuous background motion detection
 * This keeps listening even when app is backgrounded
 */
export function startBackgroundMotionDetection() {
  console.log('[bg-motion] starting background motion detection');

  // Listen to app state changes
  const subscription = AppState.addEventListener('change', handleAppStateChange);

  // Start accelerometer listener
  Accelerometer.setUpdateInterval(200);
  accelerometerSubscription = Accelerometer.addListener(async ({ x, y, z }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Always log for debugging
    if (magnitude >= SHAKE_THRESHOLD) {
      console.log(`[bg-motion] shake detected! magnitude=${magnitude.toFixed(2)}, state=${appState}`);

      // Check cooldown
      const now = Date.now();
      if (now - lastAnomalyTime < COOLDOWN_MS) {
        console.log('[bg-motion] cooldown active, skipping');
        return;
      }

      lastAnomalyTime = now;

      // Report to backend (works in background too)
      try {
        let lat = 0, lng = 0;
        const locPerm = await Location.requestForegroundPermissionsAsync();
        if (locPerm.status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }

        const res = await axios.post(`${API_URL}/anomaly`, {
          x,
          y,
          z,
          latitude: lat,
          longitude: lng,
        });

        console.log(`[bg-motion] report sent, alert_sent=${res.data.alert_sent}`);
      } catch (error: any) {
        console.log(`[bg-motion] report failed: ${error.message}`);
      }
    }
  });

  return subscription;
}

/**
 * Stop background motion detection
 */
export function stopBackgroundMotionDetection() {
  console.log('[bg-motion] stopping background motion detection');
  if (accelerometerSubscription) {
    accelerometerSubscription.remove();
    accelerometerSubscription = null;
  }
}

/**
 * Handle app state changes (foreground/background)
 */
function handleAppStateChange(status: AppStateStatus) {
  appState = status;
  console.log(`[bg-motion] app state changed to: ${status}`);

  if (status === 'active') {
    console.log('[bg-motion] app is in foreground');
  } else if (status === 'background') {
    console.log('[bg-motion] app sent to background - still listening for shake');
  } else if (status === 'inactive') {
    console.log('[bg-motion] app is inactive');
  }
}

