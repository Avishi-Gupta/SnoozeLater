// lib/setupNotifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true, 
      shouldShowList: true,   
    }),
  });


  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') {
      alert('Please enable notifications in settings!');
    }
  }

  if (Platform.OS === 'android') {

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default', 
      vibrationPattern: [500, 500],
      lightColor: '#FF231F7C',
    });
  }
}
