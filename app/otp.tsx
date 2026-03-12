import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { username, phone } = useLocalSearchParams<{ username: string; phone: string }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError]   = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  const maskedPhone = phone
    ? phone.slice(0, 2) + 'XXXXXX' + phone.slice(-2)
    : '';

  function handleChange(text: string, idx: number) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next  = [...digits];
    next[idx]   = digit;
    setDigits(next);
    setError('');
    if (digit && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  }

  function handleKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>, idx: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  function handleVerify() {
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    // Dummy verification — any 6-digit code passes
    router.replace({ pathname: '/dashboard', params: { username, phone } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Abhaya</Text>
          <Text style={styles.heading}>Verify your number</Text>
          <Text style={styles.sub}>
            Hi <Text style={styles.name}>{username}</Text>! We sent a 6-digit OTP to{'\n'}
            <Text style={styles.phone}>+91 {maskedPhone}</Text>
          </Text>
        </View>

        {/* OTP boxes */}
        <View style={styles.boxRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={el => { inputs.current[i] = el; }}
              style={[styles.box, d ? styles.boxFilled : null]}
              value={d}
              onChangeText={t => handleChange(t, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Verify button */}
        <TouchableOpacity style={styles.btn} onPress={handleVerify} activeOpacity={0.8}>
          <Text style={styles.btnText}>Verify & Continue</Text>
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity style={styles.resend} activeOpacity={0.7}>
          <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendLink}>Resend OTP</Text></Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#c0392b',
    letterSpacing: 2,
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  name: {
    color: '#fff',
    fontWeight: '600',
  },
  phone: {
    color: '#c0392b',
    fontWeight: '600',
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#1e1e1e',
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  boxFilled: {
    borderColor: '#c0392b',
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#c0392b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resend: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  resendLink: {
    color: '#c0392b',
    fontWeight: '600',
  },
});
