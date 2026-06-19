import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  // Android 13+ handled via PermissionsAndroid in RootNavigator
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

export async function getInitialNotification(): Promise<Record<string, string> | null> {
  const msg = await messaging().getInitialNotification();
  return (msg?.data as Record<string, string>) ?? null;
}
