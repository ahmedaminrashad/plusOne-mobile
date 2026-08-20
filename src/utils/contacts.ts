import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Contacts from 'react-native-contacts';
import { formatPhone, isValidPhone } from './validation';

export interface DeviceContact {
  id: string;
  name: string;
  phone: string;
}

let contactsCache: DeviceContact[] | null = null;
let contactsCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function showContactsPermissionDeniedAlert(): void {
  Alert.alert(
    'Permission needed',
    'Allow contacts access in Settings to invite people from your phone book. You can still enter phone numbers manually.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
    ],
  );
}

export async function requestContactsPermission(options?: { showDeniedAlert?: boolean }): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts permission',
        message: 'PlusOne needs access to your contacts so you can invite people you already know.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    if (!granted && options?.showDeniedAlert !== false) showContactsPermissionDeniedAlert();
    return granted;
  }

  // Always call requestPermission on iOS. checkPermission() can report
  // "undetermined" without ever showing the system dialog, so a pre-check
  // skips the prompt entirely on first launch.
  const requested = await Contacts.requestPermission();
  const granted = requested === 'authorized' || requested === 'limited';
  if (!granted && options?.showDeniedAlert !== false) showContactsPermissionDeniedAlert();
  return granted;
}

function firstValidPhone(rawNumbers: Array<{ number?: string } | string> | undefined): string | null {
  if (!rawNumbers?.length) return null;
  for (const entry of rawNumbers) {
    const raw = typeof entry === 'string' ? entry : entry.number ?? '';
    const formatted = formatPhone(raw.trim());
    if (isValidPhone(formatted)) return formatted;
  }
  return null;
}

/** Loads device contacts that have a usable phone number. */
export async function loadDeviceContacts(options?: { force?: boolean }): Promise<DeviceContact[]> {
  const granted = await requestContactsPermission({ showDeniedAlert: true });
  if (!granted) return [];

  if (
    !options?.force &&
    contactsCache &&
    Date.now() - contactsCacheAt < CACHE_TTL_MS
  ) {
    return contactsCache;
  }

  const contacts = await Contacts.getAllWithoutPhotos();
  const mapped: DeviceContact[] = [];

  for (const contact of contacts) {
    const phone = firstValidPhone(contact.phoneNumbers as any);
    if (!phone) continue;
    const name =
      contact.displayName?.trim() ||
      [contact.givenName, contact.familyName].filter(Boolean).join(' ').trim() ||
      phone;
    mapped.push({
      id: contact.recordID,
      name,
      phone,
    });
  }

  mapped.sort((a, b) => a.name.localeCompare(b.name));
  contactsCache = mapped;
  contactsCacheAt = Date.now();
  return mapped;
}
