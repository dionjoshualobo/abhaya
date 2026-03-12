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
  }, []);

  function handleSendOtp() {
    setError('');
    if (!username.trim()) { setError('Please enter your name.'); return; }
    if (!/^\d{10}$/.test(phone.trim())) { setError('Enter a valid 10-digit phone number.'); return; }
    router.replace({ pathname: '/dashboard', params: { username: username.trim(), phone: phone.trim() } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Sliding title */}
        <Animated.View style={[styles.titleWrap, { transform: [{ translateY: titleY }] }]}>
          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.titleBrand}>Abhaya</Text>
          <Text style={styles.subtitle}>Your safety companion</Text>
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

          <TouchableOpacity style={styles.btn} onPress={handleSendOtp} activeOpacity={0.8}>
            <Text style={styles.btnText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111',
  },
  kav: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 22,
    color: '#aaa',
    fontWeight: '400',
    letterSpacing: 1,
  },
  titleBrand: {
    fontSize: 52,
    fontWeight: '800',
    color: '#c0392b',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    flex: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCode: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  countryText: {
    color: '#fff',
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 10,
  },
  btn: {
    backgroundColor: '#c0392b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
