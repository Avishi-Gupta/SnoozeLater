import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function setupNotifications() {
  // Updated to include all required fields in NotificationBehavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true, // For iOS banners
      shouldShowList: true,   // For iOS notification center
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default', // Custom sounds must be added to android/res/raw in bare workflows
      vibrationPattern: [500, 500],
      lightColor: '#FF231F7C',
    });
  }
}