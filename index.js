/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Required so background/killed notification opens still deliver data
// into JS (getInitialNotification / onNotificationOpenedApp).
// iOS also needs this so Firebase Phone Auth can complete silent APNs verification.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const messaging = require('@react-native-firebase/messaging').default;
messaging().setBackgroundMessageHandler(async () => {});

AppRegistry.registerComponent(appName, () => App);
