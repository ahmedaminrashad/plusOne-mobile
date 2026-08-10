module.exports = {
  assets: ['./assets/fonts'],
  // Temporary: iOS TestFlight has no GoogleService-Info.plist yet. Linking Firebase
  // Messaging crashes at launch when FIRApp.configure runs without that plist.
  // Re-enable iOS once GoogleService-Info.plist is added for com.refaat.plusone.
  dependencies: {
    '@react-native-firebase/app': {
      platforms: {
        ios: null,
      },
    },
    '@react-native-firebase/messaging': {
      platforms: {
        ios: null,
      },
    },
  },
};
