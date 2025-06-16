import * as Notifications from 'expo-notifications';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Index() {
  useEffect(() => {
    async function askPermission() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Please enable notifications!');
      }
    }
    askPermission();
  }, []);

  return <Redirect href="/login" />;
}