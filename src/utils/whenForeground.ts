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

/**
 * Run `fn` only after the app has stayed in the foreground for `holdMs`.
 * Opening the app switcher / Home cancels the timer so we never talk to
 * SpringBoard (APNs, badge, permission prompts) mid-transition.
 */
export function whenStableForeground(fn: () => void, holdMs = 1500): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let done = false;

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const arm = () => {
    clear();
    if (done || AppState.currentState !== 'active') return;
    timer = setTimeout(() => {
      timer = null;
      if (done || AppState.currentState !== 'active') return;
      done = true;
      fn();
    }, holdMs);
  };

  arm();
  const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (done) return;
    if (state === 'active') arm();
    else clear();
  });

  return () => {
    done = true;
    clear();
    sub.remove();
  };
}
