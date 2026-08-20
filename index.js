/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Android: required so background/killed notification opens still deliver data
// into JS (getInitialNotification / onNotificationOpenedApp).
// iOS push is stubbed until GoogleService-Info.plist is added — skip Firebase here.
if (Platform.OS === 'android') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
}

AppRegistry.registerComponent(appName, () => App);
