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
import { getContacts, addContact, deleteContact } from '../frontend/services/api';

type Contact = { id: number; name: string; phone: string; relation: string };

export default function ContactsScreen() {
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [adding,  setAdding]    = useState(false);

  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [relation, setRelation] = useState('');

  async function fetchContacts() {
    try {
      const res = await getContacts();
      setContacts(res.data.contacts ?? []);
    } catch {
      Alert.alert('Error', 'Could not load contacts. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchContacts(); }, []);

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Name and phone are required.');
      return;
    }
    const formatted = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;
    try {
      setAdding(true);
      await addContact(name.trim(), formatted, relation.trim() || 'Emergency Contact');
      setName(''); setPhone(''); setRelation('');
      await fetchContacts();
    } catch {
      Alert.alert('Error', 'Could not add contact.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number, contactName: string) {
    Alert.alert('Delete', `Remove ${contactName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteContact(id);
            await fetchContacts();
          } catch {
            Alert.alert('Error', 'Could not delete contact.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Add contact form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add New Contact</Text>

          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone (10 digits or +91...)"
            placeholderTextColor="#888"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Relation (e.g. Mother, Friend)"
            placeholderTextColor="#888"
            value={relation}
            onChangeText={setRelation}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.addBtn, adding && styles.addBtnDisabled]}
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={adding}
          >
            {adding
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addBtnText}>+ Add Contact</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Contacts list */}
        <Text style={styles.sectionTitle}>Saved Contacts ({contacts.length})</Text>

        {loading && <ActivityIndicator color="#c0392b" style={{ marginTop: 20 }} />}

        {!loading && contacts.length === 0 && (
          <Text style={styles.empty}>No contacts yet. Add one above.</Text>
        )}

        {contacts.map(c => (
          <View key={c.id} style={styles.contactRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{c.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactPhone}>{c.phone}</Text>
              <Text style={styles.contactRelation}>{c.relation}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(c.id, c.name)} style={styles.deleteBtn}>
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
  safe:          { flex: 1, backgroundColor: '#111' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  backBtn:       { padding: 6 },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  scroll:        { paddingHorizontal: 20, paddingTop: 8 },
  card:          { backgroundColor: '#1e1e1e', borderRadius: 14, padding: 16, marginBottom: 24 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  input:         { backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  addBtn:        { backgroundColor: '#c0392b', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  addBtnDisabled:{ opacity: 0.6 },
  addBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty:         { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 15 },
  contactRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 12, padding: 14, marginBottom: 10 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: '#c0392b', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  contactInfo:   { flex: 1 },
  contactName:   { color: '#fff', fontSize: 16, fontWeight: '600' },
  contactPhone:  { color: '#888', fontSize: 13, marginTop: 2 },
  contactRelation:{ color: '#555', fontSize: 12, marginTop: 1 },
  deleteBtn:     { padding: 8 },
});
