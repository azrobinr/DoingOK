import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation';
import { registerPushToken } from './src/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function PushTokenRegistrar() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Device.isDevice) return;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

      await registerPushToken(user.id, tokenData.data, platform).catch(() => {
        // Non-fatal: app works without push registration
      });
    })();
  }, [user]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <PushTokenRegistrar />
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
