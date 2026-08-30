import { Platform } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

export async function sendFirebaseSms(phone: string): Promise<void> {
  // iOS must not skip verification — that blocks real SMS. Android uses
  // Play Integrity; disabling the reCAPTCHA fallback keeps the Chrome tab closed.
  if (Platform.OS === 'android') {
    try {
      const settings = auth().settings;
      settings.appVerificationDisabledForTesting = true;
      settings.forceRecaptchaFlowForTesting = false;
    } catch {
      // ignore
    }
  }
  confirmation = await auth().signInWithPhoneNumber(phone);
}

export async function confirmFirebaseSms(code: string): Promise<string> {
  if (!confirmation) {
    const err = new Error('OTP_EXPIRED');
    (err as { code?: string }).code = 'OTP_EXPIRED';
    throw err;
  }
  const cred = await confirmation.confirm(code);
  if (!cred?.user) {
    const err = new Error('OTP_INVALID');
    (err as { code?: string }).code = 'OTP_INVALID';
    throw err;
  }
  return cred.user.getIdToken();
}

export function mapFirebaseAuthError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err
    ? String((err as { code: unknown }).code)
    : '';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'PHONE_INVALID';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'OTP_RATE_LIMITED';
    case 'auth/invalid-verification-code':
    case 'auth/invalid-verification-id':
    case 'OTP_INVALID':
      return 'OTP_INVALID';
    case 'auth/session-expired':
    case 'auth/code-expired':
    case 'OTP_EXPIRED':
      return 'OTP_EXPIRED';
    case 'auth/missing-client-identifier':
      return 'FIREBASE_SHA_MISSING';
    case 'auth/app-not-authorized':
    case 'auth/operation-not-allowed':
      return 'FIREBASE_PHONE_DISABLED';
    case 'auth/web-context-cancelled':
    case 'auth/cancelled-popup-request':
      return 'FIREBASE_RECAPTCHA_CANCELLED';
    case 'auth/invalid-app-credential':
    case 'auth/missing-app-credential':
    case 'auth/captcha-check-failed':
      return 'FIREBASE_APP_VERIFY_FAILED';
    default:
      return 'GENERIC';
  }
}
