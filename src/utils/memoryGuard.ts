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

/** Jetsam on iPhone 11 killed backboardd because PlusOne sat at ~650MB. */
export function installMemoryGuard(): () => void {
  const onChange = (state: AppStateStatus) => {
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
