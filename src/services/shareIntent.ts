import { NativeModules } from 'react-native';

interface ShareIntentNativeModule {
  getInitialSharedText(): Promise<string | null>;
  getInitialSharedImage(): Promise<string | null>;
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

// Same one-shot contract, for images shared into PlusOne (e.g. an InstaPay payment
// screenshot) — native side already copied the file somewhere stable, so the returned
// URI stays valid after this call, unlike the ephemeral content:// URI it started as.
export async function consumePendingSharedImage(): Promise<string | null> {
  if (!ShareIntentModule) return null;
  try {
    return await ShareIntentModule.getInitialSharedImage();
  } catch {
    return null;
  }
}
