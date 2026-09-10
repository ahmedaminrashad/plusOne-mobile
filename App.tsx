import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Appearance, StatusBar, Platform, View, ActivityIndicator } from 'react-native';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { changeLanguage, DEFAULT_LANGUAGE } from './src/i18n';
import { AppStorage } from './src/utils/storage';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { installMemoryGuard } from './src/utils/memoryGuard';
import { Colors } from './src/constants/colors';

export default function App() {
  const [langReady, setLangReady] = useState(false);

  useEffect(() => installMemoryGuard(), []);

  useEffect(() => {
    Appearance.setColorScheme('light');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
    // Resolve language before auth UI mounts so a leftover 'ar' value cannot
    // overwrite English after the user already sees the signup screens.
    AppStorage.getLanguage()
      .then((stored) => changeLanguage(stored ?? DEFAULT_LANGUAGE))
      .finally(() => setLangReady(true));
  }, []);

  if (!langReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F3EF' },
  boot: { flex: 1, backgroundColor: '#F4F3EF', justifyContent: 'center', alignItems: 'center' },
});
