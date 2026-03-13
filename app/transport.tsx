import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  sendTransportAlert,
  stopLiveTracking,
  updateLiveTracking,
} from '../frontend/services/api';

const LIVE_TRACKING_UPDATE_MS = 15000;
const LIVE_TRACKING_AUTO_STOP_MS = 10 * 60 * 1000;

export default function TransportScreen() {
  const router = useRouter();
  const { username, phone } = useLocalSearchParams<{ username?: string; phone?: string }>();

  const [vehicle, setVehicle] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const trackingTokenRef = useRef<string | null>(null);
  const trackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTrackingTimers = useCallback(() => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
    if (trackingStopTimerRef.current) {
      clearTimeout(trackingStopTimerRef.current);
      trackingStopTimerRef.current = null;
    }
  }, []);

  const pushTrackingUpdate = useCallback(async (token: string) => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      await updateLiveTracking(token, current.coords.latitude, current.coords.longitude);
    } catch {
      // ignore intermittent GPS/network errors
    }
  }, []);

  const stopTransportTracking = useCallback(async () => {
    clearTrackingTimers();

    const token = trackingTokenRef.current;
    if (!token) {
      return;
    }

    trackingTokenRef.current = null;
    try {
      await stopLiveTracking(token);
    } catch {
      // ignore cleanup errors
    }
  }, [clearTrackingTimers]);

  const startTransportTracking = useCallback(async (token?: string) => {
    if (!token) {
      return;
    }

    trackingTokenRef.current = token;
    clearTrackingTimers();

    await pushTrackingUpdate(token);

    trackingIntervalRef.current = setInterval(() => {
      void pushTrackingUpdate(token);
    }, LIVE_TRACKING_UPDATE_MS);

    trackingStopTimerRef.current = setTimeout(() => {
      void stopTransportTracking();
    }, LIVE_TRACKING_AUTO_STOP_MS);
  }, [clearTrackingTimers, pushTrackingUpdate, stopTransportTracking]);

  useEffect(() => {
    return () => {
      void stopTransportTracking();
    };
  }, [stopTransportTracking]);

  const submitTransport = useCallback(async () => {
    setSaving(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      let latitude = 0;
      let longitude = 0;

      if (permission.status === 'granted') {
        const current = await Location.getCurrentPositionAsync({});
        latitude = current.coords.latitude;
        longitude = current.coords.longitude;
      }

      const response = await sendTransportAlert({
        latitude,
        longitude,
        personName: username,
        vehicle: vehicle.trim() || undefined,
        plateNumber: plateNumber.trim() || undefined,
        driverName: driverName.trim() || undefined,
        fromLocation: fromLocation.trim() || undefined,
        toLocation: toLocation.trim() || undefined,
        details: details.trim() || undefined,
      });

      const trackingToken = response.data?.tracking_token as string | undefined;
      void startTransportTracking(trackingToken);

      Alert.alert('Transport Alert Sent', 'Transport details and live tracking link were sent to your contacts.');
    } catch (error: any) {
      Alert.alert('Failed', error?.response?.data?.error ?? error?.message ?? 'Could not send transport alert.');
    } finally {
      setSaving(false);
    }
  }, [details, driverName, fromLocation, plateNumber, startTransportTracking, toLocation, username, vehicle]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transport Safety</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subTitle}>Share your travel details with emergency contacts.</Text>

        <Text style={styles.label}>Vehicle</Text>
        <TextInput style={styles.input} value={vehicle} onChangeText={setVehicle} placeholder="Cab / Auto / Bus / Bike" placeholderTextColor="#666" />

        <Text style={styles.label}>Plate Number</Text>
        <TextInput style={styles.input} value={plateNumber} onChangeText={setPlateNumber} placeholder="KA01AB1234" placeholderTextColor="#666" autoCapitalize="characters" />

        <Text style={styles.label}>Driver Name</Text>
        <TextInput style={styles.input} value={driverName} onChangeText={setDriverName} placeholder="Driver name" placeholderTextColor="#666" />

        <Text style={styles.label}>From</Text>
        <TextInput style={styles.input} value={fromLocation} onChangeText={setFromLocation} placeholder="Starting point" placeholderTextColor="#666" />

        <Text style={styles.label}>To</Text>
        <TextInput style={styles.input} value={toLocation} onChangeText={setToLocation} placeholder="Destination" placeholderTextColor="#666" />

        <Text style={styles.label}>Extra Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={details}
          onChangeText={setDetails}
          placeholder="Any helpful details"
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={[styles.sendBtn, saving && styles.disabledBtn]} onPress={submitTransport} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.sendBtnText}>{saving ? 'Sending…' : 'Send Transport Alert'}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>This sends only filled details + current location + live tracking link.</Text>
        {phone ? <Text style={styles.footer}>For: {username ?? 'User'} ({phone})</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f1f',
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 30 },
  subTitle: { color: '#aaa', marginBottom: 14, fontSize: 13 },
  label: { color: '#ddd', marginBottom: 6, marginTop: 12, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#1e1e1e',
    borderColor: '#2c2c2c',
    borderWidth: 1,
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendBtn: {
    marginTop: 22,
    backgroundColor: '#c0392b',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
  },
});
