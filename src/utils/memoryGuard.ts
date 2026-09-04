import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';
import { enableFreeze } from 'react-native-screens';
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
 * JetsamEvent-2026-09-04-185318: PlusOne was ~650MB and still frontmost
 * when iOS killed backboardd (per-process-limit, ~2.1GB). The snapshot
 * happens on inactive (app switcher) — do not run heavy JS there.
 */
export function installMemoryGuard(): () => void {
  const onChange = (state: AppStateStatus) => {
    if (state === 'inactive') {
      enableFreeze(true);
      return;
    }
    if (state === 'background') {
      enableFreeze(true);
      trimCaches();
      return;
    }
    if (state === 'active') {
      enableFreeze(false);
    }
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}
