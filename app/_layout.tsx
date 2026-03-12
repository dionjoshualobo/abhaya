import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'home',
};

export default function RootLayout() {
  return (
    <Stack initialRouteName="home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="contacts" />
      <Stack.Screen name="places" />
      <Stack.Screen name="heatmap" />
    </Stack>
  );
}
