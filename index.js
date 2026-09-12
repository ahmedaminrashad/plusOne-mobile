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
// Call it before AppRegistry — do not skip it. A JS try/catch cannot stop a
// native crash, but skipping this handler silently drops iOS notifications.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch (error) {
  console.warn('[PlusOne] Firebase messaging background handler failed', error);
}

AppRegistry.registerComponent(appName, () => App);
