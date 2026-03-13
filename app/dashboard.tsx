import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  PermissionsAndroid,
  Platform,
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  sendAlert,
  reportAnomaly,
  stopLiveTracking as stopLiveTrackingSession,
  updateLiveTracking,
} from '../frontend/services/api';
import { startBackgroundMotionDetection, stopBackgroundMotionDetection } from './backgroundMotion';
import {
  DEFAULT_VOICE_CODE_WORDS,
  normalizeSpeechText,
  parseVoiceCodeWords,
  VOICE_SOS_STORAGE_KEYS,
} from './voiceSosSettings';
import { colors, radius, shadow, spacing } from './theme';

const SHAKE_THRESHOLD = 5.0;  // MUST match backend ANOMALY_THRESHOLD and backgroundMotion.ts
const MOTION_LOG_INTERVAL_MS = 1000;
const VOICE_LISTEN_DURATION_MS = 10000;
const VOICE_COOLDOWN_MS = 12000;
const LIVE_TRACKING_UPDATE_MS = 15000;
const LIVE_TRACKING_AUTO_STOP_MS = 10 * 60 * 1000;

type RemovableSubscription = {
  remove: () => void;
};

type VoiceDebugEvent = {
  at: string;
  message: string;
};

type NativeVoiceModule = {
  startSpeech: (locale: string, options: Record<string, unknown>, callback: (error: string | false) => void) => void;
  stopSpeech: (callback: (error: string | false) => void) => void;
  destroySpeech: (callback: (error: string | false) => void) => void;
};

export default function DashboardScreen() {
  const { username, phone } = useLocalSearchParams<{ username: string; phone: string }>();
  const router = useRouter();

  const [active, setActive] = useState(false);
  const shakeRef = useRef(false); // prevent duplicate triggers
  const lastMotionLogAt = useRef(0);
  const lastVolumeRef = useRef<number | null>(null);
  const voiceListeningRef = useRef(false);
  const voiceMatchedRef = useRef(false);
  const voiceCooldownUntilRef = useRef(0);
  const voiceStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTrackingTokenRef = useRef<string | null>(null);
  const liveTrackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveTrackingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voiceDebugListening, setVoiceDebugListening] = useState(false);
  const [voiceDebugEnabled, setVoiceDebugEnabled] = useState(false);
  const [voiceDebugConfiguredWords, setVoiceDebugConfiguredWords] = useState<string[]>(DEFAULT_VOICE_CODE_WORDS);
  const [voiceDebugHeard, setVoiceDebugHeard] = useState<string[]>([]);
  const [voiceDebugNormalizedHeard, setVoiceDebugNormalizedHeard] = useState<string[]>([]);
  const [voiceDebugMatchedWord, setVoiceDebugMatchedWord] = useState<string | null>(null);
  const [voiceDebugEvents, setVoiceDebugEvents] = useState<VoiceDebugEvent[]>([]);
  const [voiceNativeReady, setVoiceNativeReady] = useState(false);
  const voiceEventSubscriptionsRef = useRef<RemovableSubscription[]>([]);

  const appendVoiceDebugEvent = useCallback((message: string) => {
    const now = new Date();
    const at = now.toLocaleTimeString();
    setVoiceDebugEvents((prev) => [{ at, message }, ...prev].slice(0, 8));
  }, []);

  useEffect(() => {
    const snapshot = {
      enabled: voiceDebugEnabled,
      nativeReady: voiceNativeReady,
      listening: voiceDebugListening,
      configuredWords: voiceDebugConfiguredWords,
      heard: voiceDebugHeard,
      normalized: voiceDebugNormalizedHeard,
      matchedWord: voiceDebugMatchedWord,
      events: voiceDebugEvents,
      updatedAt: new Date().toISOString(),
    };

    void AsyncStorage.setItem(VOICE_SOS_STORAGE_KEYS.debugSnapshot, JSON.stringify(snapshot)).catch(() => {
      // ignore debug persistence errors
    });
  }, [
    voiceDebugEnabled,
    voiceNativeReady,
    voiceDebugListening,
    voiceDebugConfiguredWords,
    voiceDebugHeard,
    voiceDebugNormalizedHeard,
    voiceDebugMatchedWord,
    voiceDebugEvents,
  ]);

  const clearLiveTrackingTimers = useCallback(() => {
    if (liveTrackingIntervalRef.current) {
      clearInterval(liveTrackingIntervalRef.current);
      liveTrackingIntervalRef.current = null;
    }

    if (liveTrackingStopTimerRef.current) {
      clearTimeout(liveTrackingStopTimerRef.current);
      liveTrackingStopTimerRef.current = null;
    }
  }, []);

  const pushLiveTrackingUpdate = useCallback(async (token: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      await updateLiveTracking(token, loc.coords.latitude, loc.coords.longitude);
    } catch {
      // ignore tracking update failures
    }
  }, []);

  const stopLiveTrackingFlow = useCallback(async () => {
    const token = liveTrackingTokenRef.current;
    clearLiveTrackingTimers();

    if (!token) {
      return;
    }

    liveTrackingTokenRef.current = null;
    try {
      await stopLiveTrackingSession(token);
    } catch {
      // ignore stop errors
    }
  }, [clearLiveTrackingTimers]);

  const startLiveTrackingFlow = useCallback(async (token?: string) => {
    if (!token) {
      return;
    }

    liveTrackingTokenRef.current = token;
    clearLiveTrackingTimers();

    await pushLiveTrackingUpdate(token);

    liveTrackingIntervalRef.current = setInterval(() => {
      void pushLiveTrackingUpdate(token);
    }, LIVE_TRACKING_UPDATE_MS);

    liveTrackingStopTimerRef.current = setTimeout(() => {
      void stopLiveTrackingFlow();
    }, LIVE_TRACKING_AUTO_STOP_MS);
  }, [clearLiveTrackingTimers, pushLiveTrackingUpdate, stopLiveTrackingFlow]);

  const getVoiceNativeModule = useCallback((): NativeVoiceModule | null => {
    const modules = NativeModules as {
      Voice?: NativeVoiceModule;
      RCTVoice?: NativeVoiceModule;
    };

    return modules.Voice ?? modules.RCTVoice ?? null;
  }, []);

  const isVoiceNativeAvailable = useCallback(() => {
    return getVoiceNativeModule() !== null;
  }, [getVoiceNativeModule]);

  const startNativeVoice = useCallback(async (locale: string) => {
    const nativeVoice = getVoiceNativeModule();
    if (!nativeVoice) {
      throw new Error('Voice native module is unavailable');
    }

    const options = {
      EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
      EXTRA_MAX_RESULTS: 5,
      EXTRA_PARTIAL_RESULTS: true,
      REQUEST_PERMISSIONS_AUTO: true,
    };

    await new Promise<void>((resolve, reject) => {
      nativeVoice.startSpeech(locale, options, (error) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        resolve();
      });
    });
  }, [getVoiceNativeModule]);

  const stopNativeVoice = useCallback(async () => {
    const nativeVoice = getVoiceNativeModule();
    if (!nativeVoice) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      nativeVoice.stopSpeech((error) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        resolve();
      });
    });
  }, [getVoiceNativeModule]);

  const destroyNativeVoice = useCallback(async () => {
    const nativeVoice = getVoiceNativeModule();
    if (!nativeVoice) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      nativeVoice.destroySpeech((error) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }
        resolve();
      });
    });
  }, [getVoiceNativeModule]);

  const sendVoiceAlert = useCallback(async () => {
    let latitude = 0;
    let longitude = 0;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      latitude = loc.coords.latitude;
      longitude = loc.coords.longitude;
    }

    const response = await sendAlert(latitude, longitude, username ?? undefined);
    const trackingToken = response.data?.tracking_token as string | undefined;
    void startLiveTrackingFlow(trackingToken);
    Alert.alert('Voice SOS Sent', 'Code word matched. Alert sent to your emergency contacts.');
  }, [startLiveTrackingFlow, username]);

  useEffect(() => {
    if (!username) {
      return;
    }
    void AsyncStorage.setItem('current_person_name', username).catch(() => {
      // ignore persistence errors
    });
  }, [username]);

  const stopVoiceListening = useCallback(async () => {
    if (voiceStopTimerRef.current) {
      clearTimeout(voiceStopTimerRef.current);
      voiceStopTimerRef.current = null;
    }

    if (!voiceListeningRef.current) {
      return;
    }

    voiceListeningRef.current = false;
    setVoiceDebugListening(false);
    try {
      await stopNativeVoice();
    } catch {
      // ignore if already stopped
    }
    console.log('[voice-sos] listening window closed');
    appendVoiceDebugEvent('Listening window closed');
  }, [appendVoiceDebugEvent, stopNativeVoice]);

  const startVoiceListeningWindow = useCallback(async () => {
    if (voiceListeningRef.current) {
      return;
    }

    if (Date.now() < voiceCooldownUntilRef.current) {
      return;
    }

    if (!isVoiceNativeAvailable()) {
      setVoiceNativeReady(false);
      appendVoiceDebugEvent('Voice native module unavailable (NativeModules.Voice is null)');
      Alert.alert('Voice SOS Unavailable', 'Voice module is not linked in this build. Reinstall debug app.');
      return;
    }

    setVoiceNativeReady(true);

    const enabledRaw = await AsyncStorage.getItem(VOICE_SOS_STORAGE_KEYS.enabled);
    const isEnabled = enabledRaw === 'true';
    setVoiceDebugEnabled(isEnabled);
    if (!isEnabled) {
      appendVoiceDebugEvent('Voice SOS disabled in settings');
      return;
    }

    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Microphone Permission', 'Enable microphone permission for voice SOS.');
        appendVoiceDebugEvent('Microphone permission denied');
        return;
      }
    }

    const rawCodeWords = await AsyncStorage.getItem(VOICE_SOS_STORAGE_KEYS.codeWords);
    const configuredWords = parseVoiceCodeWords(rawCodeWords);
    setVoiceDebugConfiguredWords(configuredWords);
    setVoiceDebugHeard([]);
    setVoiceDebugNormalizedHeard([]);
    setVoiceDebugMatchedWord(null);

    voiceMatchedRef.current = false;
    voiceListeningRef.current = true;
    setVoiceDebugListening(true);
    voiceCooldownUntilRef.current = Date.now() + VOICE_COOLDOWN_MS;

    console.log('[voice-sos] volume down pressed, listening for 10s');
    appendVoiceDebugEvent('Volume down detected, started 10s listening');
    Alert.alert('Voice SOS Active', 'Listening for code word for 10 seconds.');

    try {
      await startNativeVoice('en-US');
    } catch (error: any) {
      voiceListeningRef.current = false;
      setVoiceDebugListening(false);
      console.log(`[voice-sos] failed to start voice recognition: ${error?.message ?? error}`);
      appendVoiceDebugEvent(`Voice start failed: ${error?.message ?? error}`);
      return;
    }

    voiceStopTimerRef.current = setTimeout(() => {
      void stopVoiceListening();
    }, VOICE_LISTEN_DURATION_MS);
  }, [appendVoiceDebugEvent, isVoiceNativeAvailable, startNativeVoice, stopVoiceListening]);

  const processVoiceResults = useCallback(async (results: string[]) => {
    if (!voiceListeningRef.current || voiceMatchedRef.current) {
      return;
    }

    const rawCodeWords = await AsyncStorage.getItem(VOICE_SOS_STORAGE_KEYS.codeWords);
    const configuredWords = parseVoiceCodeWords(rawCodeWords);
    setVoiceDebugConfiguredWords(configuredWords);

    const normalizedWords = configuredWords.map((word) => normalizeSpeechText(word));
    const normalizedResults = results.map((line) => normalizeSpeechText(line));
    setVoiceDebugHeard(results);
    setVoiceDebugNormalizedHeard(normalizedResults);

    let matchedWord: string | null = null;
    for (const line of normalizedResults) {
      const found = normalizedWords.find((word) => word.length > 0 && line.includes(word));
      if (found) {
        matchedWord = found;
        break;
      }
    }

    const matched = matchedWord !== null;

    if (matchedWord) {
      setVoiceDebugMatchedWord(matchedWord);
    }

    if (!matched) {
      appendVoiceDebugEvent('No code word match yet');
      return;
    }

    voiceMatchedRef.current = true;
    console.log('[voice-sos] code word matched, sending SOS alert');
    appendVoiceDebugEvent(`Code word matched: "${matchedWord}"`);

    try {
      await sendVoiceAlert();
      appendVoiceDebugEvent('SOS sent successfully from voice trigger');
    } catch (error: any) {
      Alert.alert('Voice SOS Failed', `Could not send alert: ${error?.message ?? error}`);
      appendVoiceDebugEvent(`SOS send failed: ${error?.message ?? error}`);
    } finally {
      await stopVoiceListening();
    }
  }, [appendVoiceDebugEvent, sendVoiceAlert, stopVoiceListening]);

  const resetVoiceEventListeners = useCallback(() => {
    voiceEventSubscriptionsRef.current.forEach((subscription) => subscription.remove());
    voiceEventSubscriptionsRef.current = [];

    const resultsSubscription = DeviceEventEmitter.addListener('onSpeechResults', (event: { value?: string[] }) => {
      const values = event?.value ?? [];
      console.log('[voice-sos] heard:', values);
      appendVoiceDebugEvent(`Speech result: ${values.join(' | ') || '(empty)'}`);
      void processVoiceResults(values);
    });

    const errorSubscription = DeviceEventEmitter.addListener('onSpeechError', (event: { error?: { message?: string } }) => {
      const message = event?.error?.message ?? 'unknown';
      console.log('[voice-sos] speech error:', message);
      appendVoiceDebugEvent(`Speech error: ${message}`);
    });

    voiceEventSubscriptionsRef.current = [resultsSubscription, errorSubscription];
  }, [appendVoiceDebugEvent, processVoiceResults]);

  useEffect(() => {
    const codeWordsDefault = DEFAULT_VOICE_CODE_WORDS.join(', ');
    const nativeAvailable = isVoiceNativeAvailable();
    setVoiceNativeReady(nativeAvailable);
    if (nativeAvailable) {
      appendVoiceDebugEvent('Voice native module detected');
    } else {
      appendVoiceDebugEvent('Voice native module missing (NativeModules.Voice is null)');
    }

    AsyncStorage.getItem(VOICE_SOS_STORAGE_KEYS.codeWords).then((value) => {
      if (!value) {
        return AsyncStorage.setItem(VOICE_SOS_STORAGE_KEYS.codeWords, codeWordsDefault);
      }
      setVoiceDebugConfiguredWords(parseVoiceCodeWords(value));
      return null;
    }).catch(() => {
      // ignore seed errors
    });

    AsyncStorage.getItem(VOICE_SOS_STORAGE_KEYS.enabled).then((value) => {
      setVoiceDebugEnabled(value === 'true');
    }).catch(() => {
      // ignore read errors
    });

    if (nativeAvailable) {
      resetVoiceEventListeners();
    }

    const hardwareVolumeSubscription = DeviceEventEmitter.addListener('AbhayaVolumeDownPressed', () => {
      appendVoiceDebugEvent('Hardware volume-down key pressed');
      void startVoiceListeningWindow();
    });

    let volumeSubscription: RemovableSubscription = { remove: () => {} };
    let effectDisposed = false;

    void (async () => {
      try {
        const volumeModule = await import('react-native-volume-manager');
        const addVolumeListener = volumeModule?.VolumeManager?.addVolumeListener;

        if (typeof addVolumeListener !== 'function') {
          console.log('[voice-sos] volume listener unavailable in current native build');
          appendVoiceDebugEvent('Volume listener unavailable in current native build');
          return;
        }

        appendVoiceDebugEvent('Volume listener attached');

        const nextSubscription = addVolumeListener((result: { volume?: number }) => {
          const currentVolume = result.volume ?? 0;
          const previousVolume = lastVolumeRef.current;
          lastVolumeRef.current = currentVolume;

          if (previousVolume === null) {
            return;
          }

          const volumeDownPressed = currentVolume < previousVolume;
          if (volumeDownPressed) {
            appendVoiceDebugEvent(`Volume down: ${previousVolume.toFixed(2)} -> ${currentVolume.toFixed(2)}`);
            void startVoiceListeningWindow();
          }
        });

        if (effectDisposed) {
          nextSubscription.remove();
          return;
        }

        volumeSubscription = nextSubscription;
      } catch (error: any) {
        console.log(`[voice-sos] volume module unavailable: ${error?.message ?? error}`);
        appendVoiceDebugEvent(`Volume module unavailable: ${error?.message ?? error}`);
      }
    })();

    return () => {
      effectDisposed = true;
      hardwareVolumeSubscription.remove();
      volumeSubscription.remove();
      voiceEventSubscriptionsRef.current.forEach((subscription) => subscription.remove());
      voiceEventSubscriptionsRef.current = [];
      void destroyNativeVoice().catch(() => {
        // ignore cleanup errors
      });
      if (voiceStopTimerRef.current) {
        clearTimeout(voiceStopTimerRef.current);
      }
    };
  }, [appendVoiceDebugEvent, destroyNativeVoice, isVoiceNativeAvailable, processVoiceResults, resetVoiceEventListeners, startVoiceListeningWindow]);

  // Shake detection
  useEffect(() => {
    console.log(`[motion] shake detection armed (threshold=${SHAKE_THRESHOLD})`);
    // Start background motion detection (works even when app is backgrounded)
    startBackgroundMotionDetection();
    
    Accelerometer.setUpdateInterval(200);
    const sub = Accelerometer.addListener(async ({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (now - lastMotionLogAt.current >= MOTION_LOG_INTERVAL_MS) {
        lastMotionLogAt.current = now;
        console.log(
          `[motion] x=${x.toFixed(2)} y=${y.toFixed(2)} z=${z.toFixed(2)} magnitude=${magnitude.toFixed(2)} threshold=${SHAKE_THRESHOLD}`,
        );
      }

      if (magnitude >= SHAKE_THRESHOLD && !shakeRef.current) {
        console.log(
          `[motion] shake detected x=${x.toFixed(2)} y=${y.toFixed(2)} z=${z.toFixed(2)} magnitude=${magnitude.toFixed(2)}`,
        );
        shakeRef.current = true;
        setTimeout(() => { shakeRef.current = false; }, 5000); // 5s local cooldown

        // Get location then report
        try {
          let lat = 0, lng = 0;
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
          console.log(`[motion] reporting anomaly lat=${lat} lng=${lng}`);
          const res = await reportAnomaly(x, y, z, lat, lng, username ?? undefined);
          console.log(`[motion] anomaly response:`, res.data);
          if (res.data.alert_sent) {
            const contactName = res.data.contact_name || 'contacts';
            Alert.alert('🚨 SOS Sent', `Alert sent to ${contactName}`);
          } else if (res.data.cooldown_active) {
            console.log(`[motion] alert not sent - cooldown active, retry in ${res.data.retry_in_seconds}s`);
          } else {
            Alert.alert('⚠️ SOS Not Sent', res.data.sms_error || 'Check your emergency contacts.');
          }
        } catch (error: any) {
          const msg = error?.message ?? String(error);
          console.log(`[motion] anomaly report failed: ${msg}`);
          Alert.alert('❌ Error', `Failed to send SOS: ${msg}`);
        }
      }
    });
    return () => {
      console.log('[motion] shake detection disarmed');
      sub.remove();
      stopBackgroundMotionDetection();
    };
  }, [username]);

  const pulse1   = useRef(new Animated.Value(1)).current;
  const pulse2   = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  async function startAlarm() {
    setActive(true);

    pulseAnim.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse1, { toValue: 1.6, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(pulse1, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(pulse2, { toValue: 1.9, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(pulse2, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
      ]),
    );
    pulseAnim.current.start();

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

    // Send SOS alert to backend
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let latitude = 0, longitude = 0;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
      const response = await sendAlert(latitude, longitude, username ?? undefined);
      const trackingToken = response.data?.tracking_token as string | undefined;
      void startLiveTrackingFlow(trackingToken);
      Alert.alert('🚨 Alert Sent', 'SOS sent to your emergency contacts.');
    } catch (e: any) {
      Alert.alert('Failed', `Could not reach server: ${e?.message ?? e}`);
    }
  }

  function stopAlarm() {
    Alert.alert(
      'Stop SOS?',
      'Are you sure you want to stop the alarm?',
      [
        { text: 'Keep Active', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => {
          setActive(false);
          void stopLiveTrackingFlow();
          pulseAnim.current?.stop();
          pulse1.setValue(1);
          pulse2.setValue(1);
        }},
      ]
    );
  }

  useEffect(() => {
    return () => {
      void stopLiveTrackingFlow();
    };
  }, [stopLiveTrackingFlow]);
  function toggleAlarm() {
    if (active) {
      stopAlarm();
    } else {
      startAlarm();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Abhaya</Text>
          <Text style={styles.appTagline}>You are not alone here.</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/contacts')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={23} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={23} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push({ pathname: '/profile', params: { username, phone } })}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.greetingRow}>
        <Text style={styles.greetingLabel}>Hi,</Text>
        <Text style={styles.greetingName}>{username ?? 'friend'}</Text>
      </View>
      <Text style={styles.greetingSub}>This screen is your safe button — always here for you.</Text>

      {/* SOS Button */}
      <View style={styles.sosArea}>
        {active && (
          <>
            <Animated.View style={[
              styles.ring,
              { transform: [{ scale: pulse1 }],
                opacity: pulse1.interpolate({ inputRange: [1, 1.6], outputRange: [0.5, 0] }) }
            ]} />
            <Animated.View style={[
              styles.ring, styles.ring2,
              { transform: [{ scale: pulse2 }],
                opacity: pulse2.interpolate({ inputRange: [1, 1.9], outputRange: [0.4, 0] }) }
            ]} />
          </>
        )}

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.sosBtn, active && styles.sosBtnActive]}
            onPress={active ? toggleAlarm : undefined}
            onLongPress={!active ? toggleAlarm : undefined}
            delayLongPress={700}
            activeOpacity={0.9}
          >
            <Text style={styles.sosLabel}>SOS</Text>
            <Text style={styles.sosHint}>
              {active ? 'Tap to stop alert' : 'Press & hold to send'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {active && (
        <Text style={styles.alarmBanner}>🚨  ALARM ACTIVE — Help is on the way</Text>
      )}

      {/* Feature nav grid */}
      <View style={styles.navGrid}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/places')} activeOpacity={0.85}>
          <View style={styles.navIconPill}>
            <Ionicons name="location-outline" size={20} color={colors.accentStrong} />
          </View>
          <View style={styles.navTextWrap}>
            <Text style={styles.navLabel}>Safe Places</Text>
            <Text style={styles.navSubtitle}>Mark homes, hostels and trusted spots.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/heatmap')} activeOpacity={0.85}>
          <View style={[styles.navIconPill, styles.navIconWarning]}>
            <Ionicons name="map-outline" size={20} color={colors.warning} />
          </View>
          <View style={styles.navTextWrap}>
            <Text style={styles.navLabel}>Danger Heatmap</Text>
            <Text style={styles.navSubtitle}>See and report unsafe areas.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push({ pathname: '/profile', params: { username, phone } })}
          activeOpacity={0.85}
        >
          <View style={styles.navIconPill}>
            <Ionicons name="person-outline" size={20} color={colors.accentStrong} />
          </View>
          <View style={styles.navTextWrap}>
            <Text style={styles.navLabel}>Profile & Contacts</Text>
            <Text style={styles.navSubtitle}>Keep trusted people close.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push({ pathname: '/transport', params: { username, phone } })}
          activeOpacity={0.85}
        >
          <View style={styles.navIconPill}>
            <Ionicons name="car-outline" size={20} color={colors.accentStrong} />
          </View>
          <View style={styles.navTextWrap}>
            <Text style={styles.navLabel}>Transport Safety</Text>
            <Text style={styles.navSubtitle}>Share cab or ride details.</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const BTN_SIZE  = 200;
const RING_SIZE = BTN_SIZE + 60;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1.4,
  },
  appTagline: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    padding: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  greetingRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  greetingLabel: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  greetingName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  greetingSub: {
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    color: colors.textMuted,
    fontSize: 13,
  },
  sosArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  navIconPill: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    marginRight: spacing.sm,
  },
  navIconWarning: {
    backgroundColor: 'rgba(251,191,36,0.1)',
  },
  navTextWrap: {
    flex: 1,
  },
  navLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  navSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.accentSoft,
  },
  ring2: { backgroundColor: 'rgba(220,38,38,0.22)' },
  sosBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
    ...shadow.accentGlow,
  },
  sosBtnActive: { backgroundColor: colors.accent, borderColor: colors.textPrimary },
  sosLabel:     { fontSize: 52, fontWeight: '900', color: colors.textPrimary, letterSpacing: 4 },
  sosHint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  alarmBanner: {
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
