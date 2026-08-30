import { Platform } from 'react-native';
import auth, { FirebaseAuthTypes, PhoneAuthProvider } from '@react-native-firebase/auth';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
let verificationId: string | null = null;

export async function sendFirebaseSms(phone: string): Promise<void> {
  confirmation = null;
  verificationId = null;

  if (Platform.OS === 'android') {
    try {
      auth().settings.forceRecaptchaFlowForTesting = false;
    } catch {
      // ignore
    }
    confirmation = await auth().signInWithPhoneNumber(phone);
    return;
  }

  // iOS: signInWithPhoneNumber is a single JS promise and often rejects when
  // Safari reCAPTCHA backgrounds the app — even after the user finishes it.
  // verifyPhoneNumber waits on native CODE_SENT, which is the event that means
  // SMS was actually dispatched.
  const snapshot = await auth().verifyPhoneNumber(phone);
  if (snapshot.state === 'error' || !snapshot.verificationId) {
    throw snapshot.error ?? Object.assign(new Error('FIREBASE_APP_VERIFY_FAILED'), {
      code: 'auth/missing-app-credential',
    });
  }
  verificationId = snapshot.verificationId;
}

export async function confirmFirebaseSms(code: string): Promise<string> {
  let user: FirebaseAuthTypes.User | null = null;

  if (verificationId) {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const cred = await auth().signInWithCredential(credential);
    user = cred.user;
  } else if (confirmation) {
    const cred = await confirmation.confirm(code);
    user = cred?.user ?? null;
  } else {
    const err = new Error('OTP_EXPIRED');
    (err as { code?: string }).code = 'OTP_EXPIRED';
    throw err;
  }

  if (!user) {
    const err = new Error('OTP_INVALID');
    (err as { code?: string }).code = 'OTP_INVALID';
    throw err;
  }
  return user.getIdToken();
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
