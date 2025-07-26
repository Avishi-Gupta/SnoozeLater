import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { setupNotifications } from '../lib/setupNotifications';

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//     shouldShowBanner: true,
//     shouldShowList: true,
//   }),
// });

export default function Index() {
  // useEffect(() => {
  //   async function askPermission() {
  //     const { status } = await Notifications.requestPermissionsAsync();
  //     if (status !== 'granted') {
  //       alert('Please enable notifications!');
  //     }
  //   }
  //   askPermission();
  // }, []);
    useEffect(() => {
    setupNotifications();
  }, []);

  return <Redirect href="/login" />;
}