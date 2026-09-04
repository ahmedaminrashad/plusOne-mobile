import { Share } from 'react-native';

export async function sharePlainText(message: string): Promise<void> {
  if (!message.trim()) return;
  try {
    await Share.share({ message, title: '+one' });
  } catch {
    // User dismissed the sheet, or the host app (e.g. WhatsApp) returned an error.
  }
}
