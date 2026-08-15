import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Appearance, StatusBar, Platform } from 'react-native';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { changeLanguage, DEFAULT_LANGUAGE } from './src/i18n';
import { AppStorage } from './src/utils/storage';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Restore the user's saved language (if any) as early as possible, while the
  // splash screen is still covering the UI, to avoid a flash of the default language.
  useEffect(() => {
    Appearance.setColorScheme('light');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
    AppStorage.getLanguage().then((stored) => {
      if (stored && stored !== DEFAULT_LANGUAGE) {
        changeLanguage(stored);
      }
    });
  }, []);

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
