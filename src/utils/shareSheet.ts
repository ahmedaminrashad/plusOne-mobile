import { Linking, NativeModules, Platform, Share } from 'react-native';

const ShareIntent = NativeModules.ShareIntentModule as
  | {
      shareText?: (message: string) => Promise<boolean>;
      openExternal?: (url: string) => Promise<boolean>;
    }
  | undefined;

export async function sharePlainText(message: string): Promise<void> {
  if (!message.trim()) return;
  try {
    if (Platform.OS === 'ios' && ShareIntent?.shareText) {
      await ShareIntent.shareText(message);
      return;
    }
    await Share.share({ message, title: '+one' });
  } catch {
    // User dismissed the sheet, or the host app returned an error.
  }
}

/** Open InstaPay / WhatsApp / Safari without RN Linking on iOS. */
export async function openExternalApp(url: string): Promise<boolean> {
  if (!url.trim()) return false;
  try {
    if (Platform.OS === 'ios' && ShareIntent?.openExternal) {
      return !!(await ShareIntent.openExternal(url));
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
