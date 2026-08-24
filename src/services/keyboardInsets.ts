import { useEffect, useState } from 'react';
import { Keyboard, NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { KeyboardInsetsModule } = NativeModules as { KeyboardInsetsModule?: object };

// Android only: react-navigation's native-stack hosts each screen in its own Fragment,
// which never receives the window resize that RN's own KeyboardAvoidingView depends on —
// so on Android it silently does nothing over a native-stack screen. KeyboardInsetsModule
// reads the real IME WindowInsets off the decor view instead, which works regardless of
// which screen/Fragment is on top. iOS's KeyboardAvoidingView already works fine as-is.
const emitter =
  Platform.OS === 'android' && KeyboardInsetsModule
    ? new NativeEventEmitter(KeyboardInsetsModule as any)
    : null;

// Returns the current on-screen keyboard height in dp (0 when hidden). Use as bottom
// padding on whatever should sit just above the keyboard.
export function useKeyboardInsetHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (emitter) {
      const subscription = emitter.addListener('keyboardInsetHeight', (heightDp: number) => {
        setHeight(heightDp);
      });
      return () => subscription.remove();
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
