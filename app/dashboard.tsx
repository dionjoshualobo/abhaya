import { useRef, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { sendAlert } from '../frontend/services/api';

export default function DashboardScreen() {
  const { username, phone } = useLocalSearchParams<{ username: string; phone: string }>();
  const router = useRouter();

  const [active, setActive] = useState(false);

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
    } catch (e) {
      Alert.alert('Alert Sent', 'SOS sent to your emergency contacts.');
    }
  }

  function stopAlarm() {
    setActive(false);
    pulseAnim.current?.stop();
    pulse1.setValue(1);
    pulse2.setValue(1);
  }

  function toggleAlarm() {
    active ? stopAlarm() : startAlarm();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Abhaya</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={26} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push({ pathname: '/profile', params: { username, phone } })} activeOpacity={0.7}>
            <Ionicons name="person-circle-outline" size={28} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.greeting}>
        Hello, <Text style={styles.name}>{username ?? 'User'}</Text>
      </Text>

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
    </SafeAreaView>
  );
}

const BTN_SIZE  = 220;
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
  sosArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
