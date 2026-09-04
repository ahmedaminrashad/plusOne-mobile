import { AppState, AppStateStatus } from 'react-native';

export function isAppForeground(): boolean {
  return AppState.currentState === 'active';
}

/** Run `fn` now if the app is already active, otherwise on the next foreground. */
export function whenForeground(fn: () => void): () => void {
  if (AppState.currentState === 'active') {
    fn();
    return () => {};
  }
  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state !== 'active') return;
    sub.remove();
    fn();
  });
  return () => sub.remove();
}
