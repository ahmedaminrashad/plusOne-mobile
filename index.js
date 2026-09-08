/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { enableFreeze } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';

// Frozen native-stack screens can stay blank after iOS lock/unlock.
enableFreeze(false);

// Required so background/killed notification opens still deliver data
// into JS (getInitialNotification / onNotificationOpenedApp).
// iOS also needs this so Firebase Phone Auth can complete silent APNs verification.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch {
  // Firebase not ready yet — native crash here takes the whole process down.
}

AppRegistry.registerComponent(appName, () => App);
