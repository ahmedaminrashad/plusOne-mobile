import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'إذن الإشعارات',
        message: 'يحتاج التطبيق إذن الإشعارات لتنبيهك بالفواتير والمدفوعات الجديدة',
        buttonPositive: 'موافق',
        buttonNegative: 'إلغاء',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

export async function getFcmToken(): Promise<string | null> {
  try {
    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }
    return await messaging().getToken();
  } catch {
    return null;
  }
}

export function onNotificationOpenedApp(handler: (data: Record<string, string>) => void) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    if (remoteMessage.data) handler(remoteMessage.data as Record<string, string>);
  });
}

// FCM only auto-displays a system-tray notification when the app is backgrounded/killed —
// while the app is in the foreground, Android/iOS deliver the message to JS instead and it's
// up to the app to surface it. Without this, foreground notifications are silently dropped.
export function onForegroundMessage(
  handler: (notification: { title?: string; body?: string }, data: Record<string, string>) => void,
) {
  return messaging().onMessage((remoteMessage) => {
    handler(remoteMessage.notification ?? {}, (remoteMessage.data as Record<string, string>) ?? {});
  });
}

export async function getInitialNotification(): Promise<Record<string, string> | null> {
  const msg = await messaging().getInitialNotification();
  return (msg?.data as Record<string, string>) ?? null;
}
