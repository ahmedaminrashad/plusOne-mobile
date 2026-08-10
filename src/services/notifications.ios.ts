// iOS push is temporarily disabled until GoogleService-Info.plist is added.
// Platform resolution picks this file over notifications.ts on iOS.

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function getFcmToken(): Promise<string | null> {
  return null;
}

export function onNotificationOpenedApp(
  _handler: (data: Record<string, string>) => void,
): () => void {
  return () => {};
}

export function onForegroundMessage(
  _handler: (
    notification: { title?: string; body?: string },
    data: Record<string, string>,
  ) => void,
): () => void {
  return () => {};
}

export async function getInitialNotification(): Promise<Record<string, string> | null> {
  return null;
}
