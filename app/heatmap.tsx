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
import { getHeatmap, reportDangerZone } from '../frontend/services/api';

type Report = { id: number; latitude: number; longitude: number; description: string; weight: number; created_at: string };

const WEIGHT_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Low',     color: '#f39c12' },
  2: { label: 'Medium',  color: '#e67e22' },
  3: { label: 'High',    color: '#e74c3c' },
  4: { label: 'Severe',  color: '#c0392b' },
  5: { label: 'Extreme', color: '#7b241c' },
};

export default function HeatmapScreen() {
  const router = useRouter();

  const [reports,     setReports]     = useState<Report[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  const [description, setDescription] = useState('');
  const [weight,      setWeight]      = useState(3);

  async function fetchHeatmap() {
    try {
      const res = await getHeatmap();
      setReports(res.data.reports ?? []);
    } catch {
      Alert.alert('Error', 'Could not load heatmap data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchHeatmap(); }, []);

  async function handleReport() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission', 'Location permission needed.'); return; }

    try {
      setSubmitting(true);
      const loc = await Location.getCurrentPositionAsync({});
      await reportDangerZone(loc.coords.latitude, loc.coords.longitude, description.trim() || undefined, weight);
      setDescription('');
      setWeight(3);
      await fetchHeatmap();
      Alert.alert('Reported', 'Danger zone submitted. Thank you for helping keep others safe.');
    } catch {
      Alert.alert('Error', 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danger Heatmap</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Report form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Report Unsafe Area</Text>
          <Text style={styles.cardSub}>Reports help warn other users in your area.</Text>

          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Describe what happened (optional)"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Weight selector */}
          <Text style={styles.weightLabel}>Danger Level: <Text style={{ color: WEIGHT_LABELS[weight].color }}>{WEIGHT_LABELS[weight].label}</Text></Text>
          <View style={styles.weightRow}>
            {[1, 2, 3, 4, 5].map(w => (
              <TouchableOpacity
                key={w}
                style={[styles.weightBtn, weight === w && { backgroundColor: WEIGHT_LABELS[w].color }]}
                onPress={() => setWeight(w)}
              >
                <Text style={[styles.weightBtnText, weight === w && styles.weightBtnTextActive]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.reportBtn, submitting && styles.btnDisabled]}
            onPress={handleReport}
            activeOpacity={0.8}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="warning-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.reportBtnText}>Report My Current Location</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {reports.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{reports.length}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#e74c3c' }]}>
                {reports.filter(r => r.weight >= 4).length}
              </Text>
              <Text style={styles.statLabel}>High Severity</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#f39c12' }]}>
                {(reports.reduce((s, r) => s + r.weight, 0) / reports.length).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Avg Danger</Text>
            </View>
          </View>
        )}

        {/* Reports list */}
        <Text style={styles.sectionTitle}>Recent Reports</Text>

        {loading && <ActivityIndicator color="#c0392b" style={{ marginTop: 20 }} />}

        {!loading && reports.length === 0 && (
          <Text style={styles.empty}>No danger reports yet. Stay safe!</Text>
        )}

        {reports.map((r, i) => {
          const wInfo = WEIGHT_LABELS[Math.round(r.weight)] ?? WEIGHT_LABELS[3];
          return (
            <View key={r.id ?? i} style={styles.reportRow}>
              <View style={[styles.severityDot, { backgroundColor: wInfo.color }]} />
              <View style={styles.reportInfo}>
                <View style={styles.reportTopRow}>
                  <Text style={[styles.severityTag, { color: wInfo.color }]}>{wInfo.label}</Text>
                  <Text style={styles.reportDate}>{formatDate(r.created_at)}</Text>
                </View>
                <Text style={styles.reportCoords}>
                  📍 {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                </Text>
                {r.description ? <Text style={styles.reportDesc}>{r.description}</Text> : null}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#111' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  backBtn:            { padding: 6 },
  headerTitle:        { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  scroll:             { paddingHorizontal: 20, paddingTop: 8 },
  card:               { backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16, marginBottom: 20 },
  cardSub:            { color: '#666', fontSize: 13, marginBottom: 12, marginTop: -6 },
  sectionTitle:       { fontSize: 14, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  input:              { backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  multiline:          { height: 80, textAlignVertical: 'top' },
  weightLabel:        { color: '#aaa', fontSize: 14, marginBottom: 10 },
  weightRow:          { flexDirection: 'row', gap: 8, marginBottom: 14 },
  weightBtn:          { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2a2a2a', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  weightBtnText:      { color: '#888', fontSize: 16, fontWeight: '700' },
  weightBtnTextActive:{ color: '#fff' },
  reportBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#922b21', borderRadius: 10, paddingVertical: 14 },
  reportBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled:        { opacity: 0.5 },
  statsRow:           { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox:            { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum:            { fontSize: 26, fontWeight: '800', color: '#fff' },
  statLabel:          { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },
  empty:              { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 15 },
  reportRow:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14, marginBottom: 10 },
  severityDot:        { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  reportInfo:         { flex: 1 },
  reportTopRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  severityTag:        { fontSize: 13, fontWeight: '700' },
  reportDate:         { color: '#555', fontSize: 12 },
  reportCoords:       { color: '#888', fontSize: 12, marginBottom: 4 },
  reportDesc:         { color: '#aaa', fontSize: 13 },
});
