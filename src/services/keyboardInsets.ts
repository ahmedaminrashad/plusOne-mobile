import { useEffect, useState } from 'react';
import { Keyboard, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { KeyboardInsetsModule } = NativeModules as { KeyboardInsetsModule?: object };

// Android: native-stack Fragments don't receive window resize, so RN's
// KeyboardAvoidingView is a no-op. KeyboardInsetsModule reads IME insets
// off the decor view. iOS: Keyboard events are reliable; we still pad the
// composer ourselves so we don't also wrap screens in KeyboardAvoidingView
// (that double-counts and leaves a large gap above the keyboard).
const androidEmitter =
  Platform.OS === 'android' && KeyboardInsetsModule
    ? new NativeEventEmitter(KeyboardInsetsModule as any)
    : null;

/** Current on-screen keyboard height in dp (0 when hidden). Use as bottom padding. */
export function useKeyboardInsetHeight(): number {
  const [height, setHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (androidEmitter) {
      const subscription = androidEmitter.addListener('keyboardInsetHeight', (heightDp: number) => {
        setHeight(heightDp);
      });
      return () => subscription.remove();
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (height <= 0) return 0;
  // Keyboard height already covers the home-indicator inset.
  return Math.max(0, height - (Platform.OS === 'ios' ? insets.bottom : 0));
}
