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
import { colors, radius, spacing } from './theme';

const KEYS = {
  voiceSOS:      VOICE_SOS_STORAGE_KEYS.enabled,
} as const;

type SettingKey = keyof typeof KEYS;

type VoiceDebugEvent = {
  at: string;
  message: string;
};

type VoiceDebugSnapshot = {
  enabled: boolean;
  nativeReady: boolean;
  listening: boolean;
  configuredWords: string[];
  heard: string[];
  normalized: string[];
  matchedWord: string | null;
  events: VoiceDebugEvent[];
  updatedAt: string;
};

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
          <Ionicons name={icon} size={20} color={colors.accentStrong} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{label}</Text>
          {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.borderSubtle, true: colors.accentSoft }}
        thumbColor={value ? colors.accent : '#888'}
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
  const [voiceDebugSnapshot, setVoiceDebugSnapshot] = useState<VoiceDebugSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadVoiceDebugSnapshot = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(VOICE_SOS_STORAGE_KEYS.debugSnapshot);
      if (!raw) {
        setVoiceDebugSnapshot(null);
        return;
      }
      setVoiceDebugSnapshot(JSON.parse(raw) as VoiceDebugSnapshot);
    } catch {
      setVoiceDebugSnapshot(null);
    }
  }, []);

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
  }, [loadVoiceDebugSnapshot]);

  useEffect(() => {
    const interval = setInterval(() => {
      void loadVoiceDebugSnapshot();
    }, 2000);

    return () => clearInterval(interval);
  }, [loadVoiceDebugSnapshot]);

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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
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

        <View style={styles.voiceBox}>
          <Text style={styles.voiceLabel}>Voice Debug</Text>
          {voiceDebugSnapshot ? (
            <>
              <Text style={styles.voiceDesc}>Updated: {new Date(voiceDebugSnapshot.updatedAt).toLocaleTimeString()}</Text>
              <Text style={styles.debugLine}>Enabled: {voiceDebugSnapshot.enabled ? 'ON' : 'OFF'}</Text>
              <Text style={styles.debugLine}>Native module: {voiceDebugSnapshot.nativeReady ? 'READY' : 'MISSING'}</Text>
              <Text style={styles.debugLine}>Listening: {voiceDebugSnapshot.listening ? 'YES' : 'NO'}</Text>
              <Text style={styles.debugLine}>Configured words: {voiceDebugSnapshot.configuredWords.join(', ') || '(none)'}</Text>
              <Text style={styles.debugLine}>Heard: {voiceDebugSnapshot.heard.join(' | ') || '(none)'}</Text>
              <Text style={styles.debugLine}>Matched word: {voiceDebugSnapshot.matchedWord ?? '(no match yet)'}</Text>
              <Text style={styles.voiceDesc}>Recent events</Text>
              {voiceDebugSnapshot.events.length === 0 ? (
                <Text style={styles.debugEvent}>(no events yet)</Text>
              ) : (
                voiceDebugSnapshot.events.map((event, index) => (
                  <Text key={`${event.at}-${index}`} style={styles.debugEvent}>
                    {event.at} • {event.message}
                  </Text>
                ))
              )}
            </>
          ) : (
            <Text style={styles.voiceDesc}>No debug data yet. Trigger voice SOS once to populate this.</Text>
          )}
        </View>

        <Text style={styles.footer}>Abhaya v1.0.0 — Your safety companion</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll:      { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentStrong,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowText:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  rowDesc:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  voiceBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  voiceLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  voiceDesc: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 10 },
  voiceInput: {
    color: colors.textPrimary,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  debugLine: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 3,
  },
  debugEvent: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  footer:   { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: spacing.xl },
});
