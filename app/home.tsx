import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing, shadow } from './theme';

export default function HomeScreen() {
  const router = useRouter();

  const titleY    = useRef(new Animated.Value(280)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  const [username, setUsername] = useState('');
  const [phone, setPhone]       = useState('');
  const [error, setError]       = useState('');

  useEffect(() => {
    Animated.sequence([
      // Slide title up into position
      Animated.timing(titleY, {
        toValue: 0,
        duration: 750,
        useNativeDriver: true,
      }),
      // Fade in the form
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleY, formOpacity]);

  function handleSendOtp() {
    setError('');
    if (!username.trim()) { setError('Please enter your name.'); return; }
    if (!/^\d{10}$/.test(phone.trim())) { setError('Enter a valid 10-digit phone number.'); return; }
    router.push({ pathname: '/otp', params: { username: username.trim(), phone: phone.trim() } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Sliding title */}
        <Animated.View style={[styles.titleWrap, { transform: [{ translateY: titleY }] }]}>
          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.titleBrand}>Abhaya</Text>
          <Text style={styles.subtitle}>A calm place built for your safety.</Text>
        </Animated.View>

        {/* Login form fades in after slide */}
        <Animated.View style={[styles.form, { opacity: formOpacity }]}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Enter your name"
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="words"
            underlineColorAndroid="transparent"
          />

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryText}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput, { color: '#fff' }]}
              placeholder="10-digit number"
              placeholderTextColor="#888"
              value={phone}
              onChangeText={setPhone}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleSendOtp} activeOpacity={0.85}>
            <Text style={styles.btnText}>Send OTP</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  kav: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '400',
    letterSpacing: 0.8,
  },
  titleBrand: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countryCode: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  countryText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
  },
  error: {
    color: colors.textDanger,
    fontSize: 13,
    marginTop: 10,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadow.soft,
  },
  btnText: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
