import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function DashboardScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={styles.container}>
        <Text style={styles.brand}>Abhaya</Text>
        <Text style={styles.greeting}>Welcome, {username}!</Text>
        <Text style={styles.sub}>Dashboard coming soon…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#111' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  brand:     { fontSize: 36, fontWeight: '800', color: '#c0392b', letterSpacing: 2, marginBottom: 16 },
  greeting:  { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10 },
  sub:       { fontSize: 15, color: '#666' },
});
