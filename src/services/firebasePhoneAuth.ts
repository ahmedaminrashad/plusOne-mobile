import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import i18n from '../i18n';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

function authLanguage(): 'ar' | 'en' {
  return i18n.language?.startsWith('en') ? 'en' : 'ar';
}

export function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-phone-number': 'PHONE_INVALID',
    'auth/missing-phone-number': 'PHONE_INVALID',
    'auth/too-many-requests': 'OTP_RATE_LIMITED',
    'auth/quota-exceeded': 'OTP_RATE_LIMITED',
    'auth/invalid-verification-code': 'OTP_INVALID',
    'auth/invalid-verification-id': 'OTP_EXPIRED',
    'auth/session-expired': 'OTP_EXPIRED',
    'auth/missing-verification-code': 'OTP_FORMAT_INVALID',
    'auth/app-not-authorized': 'FIREBASE_SHA_MISSING',
    'auth/missing-client-identifier': 'FIREBASE_SHA_MISSING',
    'auth/captcha-check-failed': 'FIREBASE_SHA_MISSING',
  };
  return map[code] ?? 'GENERIC';
}

export async function sendFirebasePhoneCode(phone: string): Promise<'code-sent' | 'auto-verified'> {
  if (auth().currentUser) {
    await auth().signOut();
  }
  confirmation = null;
  await auth().setLanguageCode(authLanguage());
  confirmation = await auth().signInWithPhoneNumber(phone);
  if (auth().currentUser) return 'auto-verified';
  return 'code-sent';
}

export async function confirmFirebasePhoneCode(code: string): Promise<string> {
  const alreadySignedIn = auth().currentUser;
  if (alreadySignedIn) {
    return alreadySignedIn.getIdToken(true);
  }
  if (!confirmation) {
    const err = new Error('OTP_EXPIRED');
    (err as { code?: string }).code = 'auth/session-expired';
    throw err;
  }
  await confirmation.confirm(code);
  const user = auth().currentUser;
  if (!user) {
    const err = new Error('OTP_INVALID');
    (err as { code?: string }).code = 'auth/invalid-verification-code';
    throw err;
  }
  return user.getIdToken(true);
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = auth().currentUser;
  if (!user) {
    const err = new Error('OTP_EXPIRED');
    (err as { code?: string }).code = 'auth/session-expired';
    throw err;
  }
  return user.getIdToken(true);
}
