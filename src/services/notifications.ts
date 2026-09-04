import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { AppState, Platform, PermissionsAndroid, NativeModules } from 'react-native';

function dataFromRemoteMessage(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null | undefined,
): Record<string, string> | null {
  if (!remoteMessage) return null;
  const raw = remoteMessage.data;
  if (!raw || typeof raw !== 'object') return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    out[key] = String(value);
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const current = await messaging().hasPermission();
    if (
      current === messaging.AuthorizationStatus.AUTHORIZED ||
      current === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    if (current === messaging.AuthorizationStatus.DENIED) return false;
    // Prompting while backgrounded (Home button / silent push) can freeze the phone.
    if (AppState.currentState !== 'active') return false;
    const status = await messaging().requestPermission({
      alert: true,
      badge: true,
      sound: true,
    });
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Notifications',
        message: '+one needs notifications to alert you about receipts and payments.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
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
    // iOS: APNs token often arrives a beat after registration. getToken()
    // throws until Messaging.APNSToken is set.
    for (let i = 0; i < 8; i++) {
      try {
        const token = await messaging().getToken();
        if (token) return token;
      } catch {
        // keep retrying
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return null;
  } catch {
    return null;
  }
}

export function onFcmTokenRefresh(handler: (token: string) => void) {
  return messaging().onTokenRefresh(handler);
}

export function onNotificationOpenedApp(handler: (data: Record<string, string>) => void) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    const data = dataFromRemoteMessage(remoteMessage);
    if (data) handler(data);
  });
}

// FCM doesn't auto-show a tray notification while the app is in the foreground —
// surface it ourselves via an alert with a "View" action that reuses the same navigation.
export function onForegroundMessage(
  handler: (notification: { title?: string; body?: string }, data: Record<string, string>) => void,
) {
  return messaging().onMessage((remoteMessage) => {
    handler(remoteMessage.notification ?? {}, dataFromRemoteMessage(remoteMessage) ?? {});
  });
}

export async function getInitialNotification(): Promise<Record<string, string> | null> {
  const msg = await messaging().getInitialNotification();
  return dataFromRemoteMessage(msg);
}

/** Cold-start race: Firebase may not expose the open intent on the first tick. */
export async function getInitialNotificationWithRetry(
  attempts = [0, 300, 800, 1600],
): Promise<Record<string, string> | null> {
  for (let i = 0; i < attempts.length; i++) {
    const wait = attempts[i];
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait - (attempts[i - 1] ?? 0)));
    }
    const data = await getInitialNotification();
    if (data?.type || data?.groupId) return data;
  }
  return null;
}

export function clearAppBadge(): void {
  if (Platform.OS !== 'ios') return;
  try {
    NativeModules.PushNotificationManager?.setApplicationIconBadgeNumber?.(0);
  } catch {
    // Native badge API is best-effort.
  }
}
