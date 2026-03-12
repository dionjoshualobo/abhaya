import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    // Wait until navigation is ready, then always boot to calculator
    if (!navState?.key) return;
    router.replace('/');
  }, [navState?.key]);

  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
    </Stack>
  );
}
