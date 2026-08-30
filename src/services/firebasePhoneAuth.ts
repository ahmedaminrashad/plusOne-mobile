import { Platform } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

/**
 * iOS Phone Auth needs an APNs token before SMS is sent. registerForRemoteNotifications
 * is async, so a fast tap on Continue can race it and Firebase never dispatches SMS.
 */
async function waitForIosApnsToken(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messaging = require('@react-native-firebase/messaging').default as {
      (): {
        isDeviceRegisteredForRemoteMessages: boolean;
        registerDeviceForRemoteMessages: () => Promise<void>;
        getAPNSToken: () => Promise<string | null>;
      };
    };
    const msg = messaging();
    if (!msg.isDeviceRegisteredForRemoteMessages) {
      await msg.registerDeviceForRemoteMessages();
    }
    let token = await msg.getAPNSToken();
    if (!token) {
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      token = await msg.getAPNSToken();
    }
  } catch {
    // Recaptcha fallback can still complete verification if APNs is unavailable.
  }
}

export async function sendFirebaseSms(phone: string): Promise<void> {
  // Do not set appVerificationDisabledForTesting — that flag only sends SMS
  // to Firebase *test* numbers. Real iOS numbers get nothing.
  if (Platform.OS === 'android') {
    try {
      auth().settings.forceRecaptchaFlowForTesting = false;
    } catch {
      // ignore
    }
  } else {
    await waitForIosApnsToken();
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
    default:
      return 'GENERIC';
  }
}
