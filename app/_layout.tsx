import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'home',
};

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void NavigationBar.setVisibilityAsync('hidden').catch(() => {
      // ignore on unsupported devices
    });
    void NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {
      // ignore on unsupported devices
    });
    void NavigationBar.setBackgroundColorAsync('#00000000').catch(() => {
      // ignore on unsupported devices
    });
  }, []);

  return (
    <>
      <StatusBar hidden />
      <Stack initialRouteName="home" screenOptions={{ headerShown: false, statusBarHidden: true }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="contacts" />
        <Stack.Screen name="places" />
        <Stack.Screen name="heatmap" />
        <Stack.Screen name="transport" />
      </Stack>
    </>
  );
}
