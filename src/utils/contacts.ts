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
  ContactsAccessModule?: {
    authorizationStatus?: () => Promise<string>;
    requestAccess?: () => Promise<string>;
    presentLimitedAccessPicker: () => Promise<string[] | null>;
  };
};

function normalizeStatus(status: string | null | undefined): ContactsPermission {
  if (status === 'authorized' || status === 'limited' || status === 'denied' || status === 'undefined') {
    return status;
  }
  return 'undefined';
}

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

function showFullAccessRequiredAlert(): Promise<void> {
  return new Promise((resolve) => {
    Alert.alert(
      'Full contacts access',
      'PlusOne needs access to all of your contacts to add members. In Settings, set Contacts to Full Access.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve() },
        {
          text: 'Open Settings',
          onPress: () => {
            void Linking.openSettings();
            resolve();
          },
        },
      ],
    );
  });
}

export async function getContactsPermissionStatus(): Promise<ContactsPermission> {
  if (Platform.OS !== 'ios') return 'authorized';
  try {
    if (ContactsAccessModule?.authorizationStatus) {
      return normalizeStatus(await ContactsAccessModule.authorizationStatus());
    }
    return normalizeStatus(await Contacts.checkPermission());
  } catch {
    return 'undefined';
  }
}

async function requestIosAccess(): Promise<ContactsPermission> {
  try {
    if (ContactsAccessModule?.requestAccess) {
      return normalizeStatus(await ContactsAccessModule.requestAccess());
    }
    return normalizeStatus(await Contacts.requestPermission());
  } catch {
    return 'undefined';
  }
}

/** True when the OS will let us read at least some contacts. */
export function canReadContacts(status: ContactsPermission): boolean {
  return status === 'authorized' || status === 'limited';
}

/**
 * Ask for contacts permission, and for Full Access on iOS when the app
 * only has limited / selected-contacts access.
 */
export async function requestContactsPermission(options?: {
  showDeniedAlert?: boolean;
  requireFullAccess?: boolean;
}): Promise<boolean> {
  const requireFull = options?.requireFullAccess !== false;
  const showDenied = options?.showDeniedAlert !== false;

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
    if (!granted && showDenied) showContactsPermissionDeniedAlert();
    return granted;
  }

  let status = await getContactsPermissionStatus();

  if (status === 'authorized') return true;

  if (status === 'undefined') {
    status = await requestIosAccess();
    if (status === 'authorized') return true;
    if (status === 'limited') {
      if (requireFull) await showFullAccessRequiredAlert();
      return true;
    }
    if (showDenied) showContactsPermissionDeniedAlert();
    return false;
  }

  if (status === 'limited') {
    // requestAccess is a no-op after the user already chose Limited, but
    // still run it in case the OS can upgrade. Then ask for Full Access.
    const next = await requestIosAccess();
    if (next === 'authorized') return true;
    if (requireFull) await showFullAccessRequiredAlert();
    return true;
  }

  if (showDenied) showContactsPermissionDeniedAlert();
  return false;
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
  const granted = await requestContactsPermission({
    showDeniedAlert: true,
    requireFullAccess: false,
  });
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
