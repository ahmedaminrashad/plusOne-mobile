import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';
import { store } from '../store';
import { baseApi } from '../store/api/baseApi';

const ShareIntent = NativeModules.ShareIntentModule as { trimMemory?: () => Promise<boolean> } | undefined;

function trimCaches(): void {
  // Drop API payloads (chat images, receipts, ledgers). Auth tokens live in
  // authSlice, so this does not log the user out.
  store.dispatch(baseApi.util.resetApiState());
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
