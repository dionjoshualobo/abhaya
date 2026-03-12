import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getPlaces, addPlace, deletePlace, checkLocation } from '../frontend/services/api';

type Place = { id: number; label: string; latitude: number; longitude: number; radius_meters: number };

export default function PlacesScreen() {
  const router = useRouter();

  const [places,   setPlaces]   = useState<Place[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [checking, setChecking] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<{ status: string; place?: any; nearest_place?: any; distance_meters: number } | null>(null);

  const [label,   setLabel]   = useState('');
  const [radius,  setRadius]  = useState('200');

  async function fetchPlaces() {
    try {
      const res = await getPlaces();
      setPlaces(res.data.places ?? []);
    } catch {
      Alert.alert('Error', 'Could not load places. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPlaces(); }, []);

  async function handleAdd() {
    if (!label.trim()) { Alert.alert('Required', 'Label is required.'); return; }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission', 'Location permission needed to save current location.'); return; }

    try {
      setAdding(true);
      const loc = await Location.getCurrentPositionAsync({});
      await addPlace(label.trim(), loc.coords.latitude, loc.coords.longitude, parseFloat(radius) || 200);
      setLabel(''); setRadius('200');
      await fetchPlaces();
      Alert.alert('Saved', `"${label.trim()}" added as a safe place.`);
    } catch {
      Alert.alert('Error', 'Could not save place.');
    } finally {
      setAdding(false);
    }
  }

  async function handleCheckLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission', 'Location permission needed.'); return; }

    try {
      setChecking(true);
      setSafetyStatus(null);
      const loc = await Location.getCurrentPositionAsync({});
      const res = await checkLocation(loc.coords.latitude, loc.coords.longitude);
      setSafetyStatus(res.data);
    } catch {
      Alert.alert('Error', 'Could not check location.');
    } finally {
      setChecking(false);
    }
  }

  async function handleDelete(id: number, placeLabel: string) {
    Alert.alert('Delete', `Remove "${placeLabel}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deletePlace(id);
            await fetchPlaces();
          } catch {
            Alert.alert('Error', 'Could not delete place.');
          }
        },
      },
    ]);
  }

  const isSafe = safetyStatus?.status === 'safe';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safe Places</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Location check */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Am I Safe Right Now?</Text>

          <TouchableOpacity
            style={[styles.checkBtn, checking && styles.btnDisabled]}
            onPress={handleCheckLocation}
            activeOpacity={0.8}
            disabled={checking}
          >
            {checking
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="location-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.checkBtnText}>Check My Location</Text>
                </>
            }
          </TouchableOpacity>

          {safetyStatus && (
            <View style={[styles.statusBadge, isSafe ? styles.statusSafe : styles.statusSuspicious]}>
              <Ionicons name={isSafe ? 'checkmark-circle' : 'warning'} size={22} color="#fff" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.statusText}>{isSafe ? '✅ You are SAFE' : '⚠️ SUSPICIOUS area'}</Text>
                <Text style={styles.statusSub}>
                  Nearest: {(safetyStatus.place ?? safetyStatus.nearest_place)?.label ?? 'Unknown'} · {Math.round(safetyStatus.distance_meters)}m away
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Add place form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Save Current Location as Safe</Text>

          <TextInput
            style={styles.input}
            placeholder="Label (e.g. Home, College)"
            placeholderTextColor="#888"
            value={label}
            onChangeText={setLabel}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Safe radius in meters (default 200)"
            placeholderTextColor="#888"
            value={radius}
            onChangeText={setRadius}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[styles.addBtn, adding && styles.btnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={adding}
          >
            {adding
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addBtnText}>📍 Save My Current Location</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Places list */}
        <Text style={styles.sectionTitle}>Saved Safe Places ({places.length})</Text>

        {loading && <ActivityIndicator color="#c0392b" style={{ marginTop: 20 }} />}

        {!loading && places.length === 0 && (
          <Text style={styles.empty}>No safe places saved yet.</Text>
        )}

        {places.map(p => (
          <View key={p.id} style={styles.placeRow}>
            <View style={styles.placeIcon}>
              <Ionicons name="home-outline" size={20} color="#c0392b" />
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeLabel}>{p.label}</Text>
              <Text style={styles.placeCoords}>{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</Text>
              <Text style={styles.placeRadius}>Radius: {p.radius_meters}m</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(p.id, p.label)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color="#c0392b" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#111' },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  backBtn:           { padding: 6 },
  headerTitle:       { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  scroll:            { paddingHorizontal: 20, paddingTop: 8 },
  card:              { backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16, marginBottom: 20 },
  sectionTitle:      { fontSize: 14, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  checkBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a5276', borderRadius: 10, paddingVertical: 14 },
  checkBtnText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDisabled:       { opacity: 0.5 },
  statusBadge:       { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 14, marginTop: 12 },
  statusSafe:        { backgroundColor: '#1e8449' },
  statusSuspicious:  { backgroundColor: '#922b21' },
  statusText:        { color: '#fff', fontSize: 15, fontWeight: '700' },
  statusSub:         { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  input:             { backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  addBtn:            { backgroundColor: '#c0392b', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addBtnText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty:             { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 15 },
  placeRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14, marginBottom: 10 },
  placeIcon:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  placeInfo:         { flex: 1 },
  placeLabel:        { color: '#fff', fontSize: 16, fontWeight: '600' },
  placeCoords:       { color: '#888', fontSize: 12, marginTop: 2 },
  placeRadius:       { color: '#555', fontSize: 12, marginTop: 1 },
  deleteBtn:         { padding: 8 },
});
