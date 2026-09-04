import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Appearance, StatusBar, Platform } from 'react-native';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { changeLanguage, DEFAULT_LANGUAGE } from './src/i18n';
import { AppStorage } from './src/utils/storage';
import ErrorBoundary from './src/components/common/ErrorBoundary';

export default function App() {
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

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <Provider store={store}>
            <RootNavigator />
          </Provider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
