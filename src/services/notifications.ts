import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { AppState, AppStateStatus, Platform, PermissionsAndroid, NativeModules } from 'react-native';

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

function waitUntilActive(timeoutMs = 8000): Promise<boolean> {
  if (AppState.currentState === 'active') return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sub.remove();
      resolve(AppState.currentState === 'active');
    }, timeoutMs);
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      clearTimeout(timer);
      sub.remove();
      resolve(true);
    });
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await waitUntilActive();

  if (Platform.OS === 'ios') {
    const current = await messaging().hasPermission();
    if (
      current === messaging.AuthorizationStatus.AUTHORIZED ||
      current === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    if (current === messaging.AuthorizationStatus.DENIED) return false;
    await waitUntilActive();
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
    // Recents / the permission sheet can make us `inactive`. Wait instead of
    // aborting — aborting is why tokens never reached the server.
    await waitUntilActive();
    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }
    const attempts = Platform.OS === 'ios' ? 20 : 10;
    const delayMs = Platform.OS === 'ios' ? 500 : 400;
    for (let i = 0; i < attempts; i++) {
      try {
        const token = await messaging().getToken();
        if (token) return token;
      } catch {
        // APNs / Play Services not ready yet
      }
      await new Promise((r) => setTimeout(r, delayMs));
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
  if (AppState.currentState !== 'active') return;
  const badge = NativeModules.AppBadgeModule as { clear?: () => Promise<boolean> } | undefined;
  if (!badge?.clear) return;
  badge.clear().catch(() => {});
  try {
    const { store } = require('../store') as typeof import('../store');
    const { usersApi } = require('../store/api/usersApi') as typeof import('../store/api/usersApi');
    store.dispatch(usersApi.endpoints.clearUnreadBadge.initiate());
  } catch {
    /* store not ready */
  }
}
