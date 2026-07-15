import { NativeModules } from 'react-native';

interface ShareIntentNativeModule {
  getInitialSharedText(): Promise<string | null>;
}

const { ShareIntentModule } = NativeModules as { ShareIntentModule?: ShareIntentNativeModule };

// Backed by a native module on both platforms: Android via an ACTION_SEND intent-filter
// on MainActivity, iOS via a Share Extension writing into an App Group container. Both
// sides expose the same one-shot "give me whatever's pending, then clear it" contract.
export async function consumePendingSharedText(): Promise<string | null> {
  if (!ShareIntentModule) return null;
  try {
    return await ShareIntentModule.getInitialSharedText();
  } catch {
    return null;
  }
}
