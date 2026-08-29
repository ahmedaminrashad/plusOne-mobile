import { Share } from 'react-native';

export async function sharePlainText(message: string): Promise<void> {
  if (!message.trim()) return;
  await Share.share({ message, title: '+one' });
}
