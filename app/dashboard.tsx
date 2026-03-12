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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Voice from '@react-native-voice/voice';
import { sendAlert, reportAnomaly } from '../frontend/services/api';
import { startBackgroundMotionDetection, stopBackgroundMotionDetection } from './backgroundMotion';
import {
  DEFAULT_VOICE_CODE_WORDS,
  normalizeSpeechText,
  parseVoiceCodeWords,
  VOICE_SOS_STORAGE_KEYS,
} from './voiceSosSettings';

const SHAKE_THRESHOLD = 5.0;  // MUST match backend ANOMALY_THRESHOLD and backgroundMotion.ts
const MOTION_LOG_INTERVAL_MS = 1000;
const VOICE_LISTEN_DURATION_MS = 10000;
const VOICE_COOLDOWN_MS = 12000;

type RemovableSubscription = {
  remove: () => void;
};

type VoiceDebugEvent = {
  at: string;
  message: string;
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
  const [voiceDebugListening, setVoiceDebugListening] = useState(false);
  const [voiceDebugEnabled, setVoiceDebugEnabled] = useState(false);
  const [voiceDebugConfiguredWords, setVoiceDebugConfiguredWords] = useState<string[]>(DEFAULT_VOICE_CODE_WORDS);
  const [voiceDebugHeard, setVoiceDebugHeard] = useState<string[]>([]);
  const [voiceDebugNormalizedHeard, setVoiceDebugNormalizedHeard] = useState<string[]>([]);
  const [voiceDebugMatchedWord, setVoiceDebugMatchedWord] = useState<string | null>(null);
  const [voiceDebugEvents, setVoiceDebugEvents] = useState<VoiceDebugEvent[]>([]);
  const [voiceNativeReady, setVoiceNativeReady] = useState(false);

  const appendVoiceDebugEvent = useCallback((message: string) => {
    const now = new Date();
    const at = now.toLocaleTimeString();
    setVoiceDebugEvents((prev) => [{ at, message }, ...prev].slice(0, 8));
  }, []);

  const isVoiceNativeAvailable = useCallback(() => {
    return Boolean((NativeModules as { Voice?: unknown }).Voice);
  }, []);

  const sendVoiceAlert = useCallback(async () => {
    let latitude = 0;
    let longitude = 0;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      latitude = loc.coords.latitude;
      longitude = loc.coords.longitude;
    }

    await sendAlert(latitude, longitude);
    Alert.alert('Voice SOS Sent', 'Code word matched. Alert sent to your emergency contacts.');
  }, []);

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
      await Voice.stop();
    } catch {
      // ignore if already stopped
    }
    console.log('[voice-sos] listening window closed');
    appendVoiceDebugEvent('Listening window closed');
  }, [appendVoiceDebugEvent]);

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
      await Voice.start('en-US');
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
  }, [appendVoiceDebugEvent, isVoiceNativeAvailable, stopVoiceListening]);

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

    Voice.onSpeechResults = (event) => {
      const values = event.value ?? [];
      console.log('[voice-sos] heard:', values);
      appendVoiceDebugEvent(`Speech result: ${values.join(' | ') || '(empty)'}`);
      void processVoiceResults(values);
    };

    Voice.onSpeechError = (event) => {
      console.log('[voice-sos] speech error:', event.error?.message);
      appendVoiceDebugEvent(`Speech error: ${event.error?.message ?? 'unknown'}`);
    };

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
      volumeSubscription.remove();
      if (isVoiceNativeAvailable()) {
        Voice.destroy().then(Voice.removeAllListeners).catch(() => {
          // ignore cleanup errors
        });
      }
      if (voiceStopTimerRef.current) {
        clearTimeout(voiceStopTimerRef.current);
      }
    };
  }, [appendVoiceDebugEvent, isVoiceNativeAvailable, processVoiceResults, startVoiceListeningWindow]);

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
          const res = await reportAnomaly(x, y, z, lat, lng);
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
  }, []);

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
      await sendAlert(latitude, longitude);
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
          pulseAnim.current?.stop();
          pulse1.setValue(1);
          pulse2.setValue(1);
        }},
      ]
    );
  }
  function toggleAlarm() {
    if (active) {
      stopAlarm();
    } else {
      startAlarm();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Abhaya</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/contacts')} activeOpacity={0.7}>
            <Ionicons name="people-outline" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/profile', params: { username, phone } })} activeOpacity={0.7}>
            <Ionicons name="person-circle-outline" size={26} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.greeting}>
        Hello, <Text style={styles.name}>{username ?? 'User'}</Text>
      </Text>

      <View style={styles.voiceDebugCard}>
        <Text style={styles.voiceDebugTitle}>Voice SOS Debug</Text>
        <Text style={styles.voiceDebugLine}>Enabled: {voiceDebugEnabled ? 'ON' : 'OFF'}</Text>
        <Text style={styles.voiceDebugLine}>Native module: {voiceNativeReady ? 'READY' : 'MISSING'}</Text>
        <Text style={styles.voiceDebugLine}>Listening: {voiceDebugListening ? 'YES (10s window)' : 'NO'}</Text>
        <Text style={styles.voiceDebugLine}>Configured words: {voiceDebugConfiguredWords.join(', ') || '(none)'}</Text>
        <Text style={styles.voiceDebugLine}>Heard: {voiceDebugHeard.join(' | ') || '(no speech yet)'}</Text>
        <Text style={styles.voiceDebugLine}>Normalized: {voiceDebugNormalizedHeard.join(' | ') || '(none)'}</Text>
        <Text style={styles.voiceDebugLine}>Matched word: {voiceDebugMatchedWord ?? '(no match yet)'}</Text>
        <Text style={styles.voiceDebugEventsTitle}>Recent events</Text>
        {voiceDebugEvents.length === 0 ? (
          <Text style={styles.voiceDebugEvent}>(no events yet)</Text>
        ) : (
          voiceDebugEvents.map((event, index) => (
            <Text key={`${event.at}-${index}`} style={styles.voiceDebugEvent}>
              {event.at} • {event.message}
            </Text>
          ))
        )}
      </View>

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
            onPress={toggleAlarm}
            activeOpacity={0.85}
          >
            <Text style={styles.sosLabel}>SOS</Text>
            <Text style={styles.sosHint}>{active ? 'TAP TO STOP' : 'TAP TO ALERT'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {active && (
        <Text style={styles.alarmBanner}>🚨  ALARM ACTIVE — Help is on the way</Text>
      )}

      {/* Feature nav grid */}
      <View style={styles.navGrid}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/places')} activeOpacity={0.8}>
          <Ionicons name="location-outline" size={22} color="#c0392b" />
          <Text style={styles.navLabel}>Safe Places</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/heatmap')} activeOpacity={0.8}>
          <Ionicons name="map-outline" size={22} color="#c0392b" />
          <Text style={styles.navLabel}>Heatmap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push({ pathname: '/profile', params: { username, phone } })} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={22} color="#c0392b" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const BTN_SIZE  = 200;
const RING_SIZE = BTN_SIZE + 60;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#c0392b', letterSpacing: 1.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:     { padding: 6 },
  greeting:    { fontSize: 16, color: '#888', paddingHorizontal: 24, marginBottom: 8 },
  name:        { color: '#fff', fontWeight: '600' },
  voiceDebugCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2f2f2f',
  },
  voiceDebugTitle: {
    color: '#f1f1f1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  voiceDebugLine: {
    color: '#cfcfcf',
    fontSize: 12,
    marginBottom: 3,
  },
  voiceDebugEventsTitle: {
    color: '#f1f1f1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },
  voiceDebugEvent: {
    color: '#a7a7a7',
    fontSize: 11,
    marginBottom: 2,
  },
  sosArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  navBtn: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  navLabel: { color: '#ccc', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: '#c0392b',
  },
  ring2: { backgroundColor: '#922b21' },
  sosBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#c0392b',
    elevation: 10,
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  sosBtnActive: { backgroundColor: '#c0392b', borderColor: '#fff' },
  sosLabel:     { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  sosHint:      { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, marginTop: 4 },
  alarmBanner: {
    backgroundColor: '#c0392b',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
