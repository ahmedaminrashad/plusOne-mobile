import { Platform, PermissionsAndroid, Alert, Linking, NativeModules } from 'react-native';
import Contacts from 'react-native-contacts';
import { formatPhone, isValidPhone } from './validation';

export interface DeviceContact {
  id: string;
  name: string;
  phone: string;
}

export type ContactsPermission = 'authorized' | 'limited' | 'denied' | 'undefined';

let contactsCache: DeviceContact[] | null = null;
let contactsCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const { ContactsAccessModule } = NativeModules as {
  ContactsAccessModule?: { presentLimitedAccessPicker: () => Promise<string[] | null> };
};

export function invalidateContactsCache(): void {
  contactsCache = null;
  contactsCacheAt = 0;
}

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

export async function getContactsPermissionStatus(): Promise<ContactsPermission> {
  if (Platform.OS !== 'ios') return 'authorized';
  const status = await Contacts.checkPermission();
  if (status === 'authorized' || status === 'limited' || status === 'denied' || status === 'undefined') {
    return status;
  }
  return 'undefined';
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

  // Check first so we don't re-prompt (or hang) when the user already chose
  // iOS "Allow selected contacts" / limited access.
  const existing = await Contacts.checkPermission();
  if (existing === 'authorized' || existing === 'limited') return true;

  const requested = await Contacts.requestPermission();
  const granted = requested === 'authorized' || requested === 'limited';
  if (!granted && options?.showDeniedAlert !== false) showContactsPermissionDeniedAlert();
  return granted;
}

/** iOS 18 limited access: re-open the system sheet so the user can grant more contacts. */
export async function presentLimitedContactsPicker(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !ContactsAccessModule?.presentLimitedAccessPicker) {
    await Linking.openSettings();
    return false;
  }
  try {
    await ContactsAccessModule.presentLimitedAccessPicker();
    invalidateContactsCache();
    return true;
  } catch {
    await Linking.openSettings();
    return false;
  }
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CONTACTS_TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
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

  const contacts = await withTimeout(Contacts.getAllWithoutPhotos(), 12_000);
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
