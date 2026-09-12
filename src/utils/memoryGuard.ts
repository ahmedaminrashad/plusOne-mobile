import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';

const ShareIntent = NativeModules.ShareIntentModule as { trimMemory?: () => Promise<boolean> } | undefined;

function trimCaches(): void {
  // Do not resetApiState() or invalidate Message — that refetches and
  // re-decodes every chat photo the next time Home → Chat is opened.
  if (Platform.OS === 'ios') {
    ShareIntent?.trimMemory?.().catch(() => {});
  }
}

/**
 * Recents snapshots the live UI while we are only `inactive`. Freezing
 * screens or resetting caches at that moment is what locks SpringBoard.
 * Trim only after a real background (Home / another app), never in Recents.
 */
export function installMemoryGuard(): () => void {
  const onChange = (state: AppStateStatus) => {
    if (state === 'background') {
      trimCaches();
    }
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}
