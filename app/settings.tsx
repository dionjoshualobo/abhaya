import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
};

function SettingRow({ icon, label, description, value, onToggle }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color="#c0392b" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{label}</Text>
          {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#2a2a2a', true: '#c0392b' }}
        thumbColor={value ? '#fff' : '#888'}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const [vibration,      setVibration]      = useState(true);
  const [locationShare,  setLocationShare]  = useState(false);
  const [notifications,  setNotifications]  = useState(true);
  const [autoAlert,      setAutoAlert]      = useState(false);
  const [stealthMode,    setStealthMode]    = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* SOS Section */}
        <Text style={styles.section}>SOS Behaviour</Text>
        <SettingRow
          icon="phone-portrait-outline"
          label="Vibration Alert"
          description="Vibrate phone when SOS is triggered"
          value={vibration}
          onToggle={setVibration}
        />
        <SettingRow
          icon="timer-outline"
          label="Auto-Alert Contacts"
          description="Notify emergency contacts automatically"
          value={autoAlert}
          onToggle={setAutoAlert}
        />
        <SettingRow
          icon="eye-off-outline"
          label="Stealth Mode"
          description="Trigger SOS without visible alarm"
          value={stealthMode}
          onToggle={setStealthMode}
        />

        {/* Privacy Section */}
        <Text style={styles.section}>Privacy</Text>
        <SettingRow
          icon="location-outline"
          label="Share Location"
          description="Share live location during SOS"
          value={locationShare}
          onToggle={setLocationShare}
        />
        <SettingRow
          icon="notifications-outline"
          label="Notifications"
          description="Allow push notifications"
          value={notifications}
          onToggle={setNotifications}
        />

        <Text style={styles.footer}>Abhaya v1.0.0 — Your safety companion</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#111' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll:      { paddingHorizontal: 20, paddingBottom: 40 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c0392b',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rowDesc:  { fontSize: 12, color: '#666', marginTop: 2 },
  footer:   { textAlign: 'center', color: '#444', fontSize: 12, marginTop: 36 },
});
