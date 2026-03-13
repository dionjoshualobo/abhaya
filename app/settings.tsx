import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  VOICE_SOS_STORAGE_KEYS,
  DEFAULT_VOICE_CODE_WORDS,
} from './voiceSosSettings';

const KEYS = {
  voiceSOS:      VOICE_SOS_STORAGE_KEYS.enabled,
} as const;

type SettingKey = keyof typeof KEYS;

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

const DEFAULTS: Record<SettingKey, boolean> = {
  voiceSOS:      false,
};

export default function SettingsScreen() {
  const router = useRouter();

  const [settings, setSettings] = useState<Record<SettingKey, boolean>>(DEFAULTS);
  const [voiceCodeWords, setVoiceCodeWords] = useState(DEFAULT_VOICE_CODE_WORDS.join(', '));
  const [loaded, setLoaded] = useState(false);

  // Load all settings from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet(Object.values(KEYS));
        const loaded: Record<SettingKey, boolean> = { ...DEFAULTS };
        pairs.forEach(([storageKey, value]) => {
          const settingKey = (Object.entries(KEYS) as [SettingKey, string][])
            .find(([, v]) => v === storageKey)?.[0];
          if (settingKey && value !== null) {
            loaded[settingKey] = value === 'true';
          }
        });
        const storedCodeWords = await AsyncStorage.getItem(VOICE_SOS_STORAGE_KEYS.codeWords);
        if (storedCodeWords && storedCodeWords.trim().length > 0) {
          setVoiceCodeWords(storedCodeWords);
        }
        setSettings(loaded);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const toggle = useCallback(async (key: SettingKey, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await AsyncStorage.setItem(KEYS[key], String(value));
  }, []);

  const saveVoiceCodeWords = useCallback(async () => {
    const sanitized = voiceCodeWords.trim();
    if (!sanitized) {
      await AsyncStorage.setItem(VOICE_SOS_STORAGE_KEYS.codeWords, DEFAULT_VOICE_CODE_WORDS.join(', '));
      setVoiceCodeWords(DEFAULT_VOICE_CODE_WORDS.join(', '));
      return;
    }

    await AsyncStorage.setItem(VOICE_SOS_STORAGE_KEYS.codeWords, sanitized);
  }, [voiceCodeWords]);

  if (!loaded) return null; // avoid flash of default state

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

        <Text style={styles.section}>Voice SOS</Text>
        <SettingRow
          icon="mic-outline"
          label="Voice Activation"
          description="Press volume down to listen for 10 seconds"
          value={settings.voiceSOS}
          onToggle={v => toggle('voiceSOS', v)}
        />

        <View style={styles.voiceBox}>
          <Text style={styles.voiceLabel}>Code Words</Text>
          <Text style={styles.voiceDesc}>Comma-separated words or phrases. Example: help me, abhaya</Text>
          <TextInput
            style={styles.voiceInput}
            value={voiceCodeWords}
            onChangeText={setVoiceCodeWords}
            onBlur={saveVoiceCodeWords}
            placeholder="help me, abhaya"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

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
  voiceBox: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  voiceLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  voiceDesc: { color: '#666', fontSize: 12, marginTop: 4, marginBottom: 10 },
  voiceInput: {
    color: '#fff',
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  footer:   { textAlign: 'center', color: '#444', fontSize: 12, marginTop: 36 },
});
