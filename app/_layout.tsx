import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'home',
};

export default function RootLayout() {
  return (
    <Stack initialRouteName="home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
