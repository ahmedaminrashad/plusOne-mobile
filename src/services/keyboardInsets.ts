import { useEffect, useState } from 'react';
import { Keyboard, NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { KeyboardInsetsModule } = NativeModules as { KeyboardInsetsModule?: object };

// Android: native-stack Fragments don't receive window resize, so RN's
// KeyboardAvoidingView is a no-op. KeyboardInsetsModule reads IME insets
// off the decor view (distance from window bottom to the top of the keys).
// iOS: Keyboard.endCoordinates.height is that same distance — do not subtract
// the home-indicator inset. Screens sit on the window bottom (SafeScreen only
// pads the top; the tab bar is collapsed while the keyboard is open), so
// subtracting insets.bottom leaves the composer overlapping the keys.
const androidEmitter =
  Platform.OS === 'android' && KeyboardInsetsModule
    ? new NativeEventEmitter(KeyboardInsetsModule as any)
    : null;

/** Current on-screen keyboard height in dp (0 when hidden). Use as bottom padding. */
export function useKeyboardInsetHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (androidEmitter) {
      const subscription = androidEmitter.addListener('keyboardInsetHeight', (heightDp: number) => {
        setHeight(heightDp);
      });
      return () => subscription.remove();
    }

    const apply = (e: { endCoordinates: { height: number } }) => {
      setHeight(e.endCoordinates.height);
    };
    const hide = () => setHeight(0);

    if (Platform.OS === 'ios') {
      const show = Keyboard.addListener('keyboardWillShow', apply);
      const change = Keyboard.addListener('keyboardWillChangeFrame', apply);
      const hideSub = Keyboard.addListener('keyboardWillHide', hide);
      return () => {
        show.remove();
        change.remove();
        hideSub.remove();
      };
    }

    const show = Keyboard.addListener('keyboardDidShow', apply);
    const hideSub = Keyboard.addListener('keyboardDidHide', hide);
    return () => {
      show.remove();
      hideSub.remove();
    };
  }, []);

  return height > 0 ? height : 0;
}
