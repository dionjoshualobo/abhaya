import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

export default function ProfileScreen() {
  const router = useRouter();
  const { username, phone } = useLocalSearchParams<{ username: string; phone: string }>();

  const [name,      setName]      = useState(username ?? '');
  const [dob,       setDob]       = useState('');
  const [gender,    setGender]    = useState('Female');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyName,  setEmergencyName]  = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Name cannot be empty.'); return; }
    if (emergencyPhone && !/^\d{10}$/.test(emergencyPhone.trim())) {
      Alert.alert('Invalid', 'Emergency contact must be a 10-digit number.'); return;
    }
    Alert.alert('Saved', 'Your profile has been updated.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={52} color="#c0392b" />
          </View>
          <Text style={styles.avatarName}>{name || 'Your Name'}</Text>
          {phone ? <Text style={styles.avatarPhone}>+91 {phone}</Text> : null}
        </View>

        {/* Personal Info */}
        <Text style={styles.section}>Personal Information</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          placeholderTextColor="#666"
          autoCapitalize="words"
          underlineColorAndroid="transparent"
        />

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.readonlyRow}>
          <Text style={styles.readonlyPrefix}>+91</Text>
          <Text style={styles.readonlyValue}>{phone ?? '—'}</Text>
          <Ionicons name="lock-closed-outline" size={14} color="#555" />
        </View>

        <Text style={styles.label}>Date of Birth</Text>
        <TextInput
          style={styles.input}
          value={dob}
          onChangeText={setDob}
          placeholder="DD / MM / YYYY"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          underlineColorAndroid="transparent"
        />

        <Text style={styles.label}>Blood Group</Text>
        <TextInput
          style={styles.input}
          value={bloodGroup}
          onChangeText={setBloodGroup}
          placeholder="e.g. B+"
          placeholderTextColor="#666"
          autoCapitalize="characters"
          underlineColorAndroid="transparent"
        />

        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, gender === g && styles.chipActive]}
              onPress={() => setGender(g)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Contact */}
        <Text style={styles.section}>Emergency Contact</Text>

        <Text style={styles.label}>Contact Name</Text>
        <TextInput
          style={styles.input}
          value={emergencyName}
          onChangeText={setEmergencyName}
          placeholder="e.g. Mom, Dad, Friend"
          placeholderTextColor="#666"
          autoCapitalize="words"
          underlineColorAndroid="transparent"
        />

        <Text style={styles.label}>Contact Phone</Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefix}><Text style={styles.prefixText}>+91</Text></View>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="10-digit number"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            maxLength={10}
            underlineColorAndroid="transparent"
          />
        </View>

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save Profile</Text>
        </TouchableOpacity>

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

  scroll: { paddingHorizontal: 22, paddingBottom: 48 },

  avatarWrap: { alignItems: 'center', marginTop: 28, marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: '#c0392b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarName:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  avatarPhone: { fontSize: 13, color: '#888', marginTop: 2 },

  section: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c0392b',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#222',
    gap: 8,
  },
  readonlyPrefix: { fontSize: 15, color: '#666' },
  readonlyValue:  { fontSize: 15, color: '#555', flex: 1 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  chipActive:     { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  chipText:       { color: '#888', fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  phoneRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  prefixText: { color: '#fff', fontSize: 15 },
  phoneInput: { flex: 1 },

  saveBtn: {
    backgroundColor: '#c0392b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
});
