import { NativeModules, Platform } from 'react-native';
import auth, { FirebaseAuthTypes, PhoneAuthProvider } from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';

let confirmation: FirebaseAuthTypes.ConfirmationResult | null = null;
let verificationId: string | null = null;

type NativePhoneAuth = {
  verifyPhoneNumber: (phone: string) => Promise<string>;
};

const nativePhoneAuth = NativeModules.FirebasePhoneAuthModule as NativePhoneAuth | undefined;

async function prepareIosApns(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }
    // AppDelegate sets Auth.auth().APNSToken asynchronously. Give it a beat
    // so silent verification can run before Firebase falls back to reCAPTCHA.
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  } catch {
    // reCAPTCHA fallback still works without a token.
  }
}

function waitForPhoneSnapshot(phone: string, forceResend: boolean): Promise<FirebaseAuthTypes.PhoneAuthSnapshot> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(Object.assign(new Error('OTP_EXPIRED'), { code: 'auth/code-expired' })),
      );
    }, 120000);

    // Attach the listener in the same tick as construction so CODE_SENT cannot be missed.
    auth()
      .verifyPhoneNumber(phone, forceResend)
      .on(
        'state_changed',
        (snapshot) => {
          if (snapshot.state === 'sent' || snapshot.state === 'verified') {
            finish(() => resolve(snapshot));
            return;
          }
          if (snapshot.state === 'timeout' && snapshot.verificationId) {
            finish(() => resolve(snapshot));
            return;
          }
          if (snapshot.state === 'error') {
            finish(() => reject(snapshot.error ?? snapshot));
          }
        },
        (error) => finish(() => reject(error)),
      );
  });
}

export async function sendFirebaseSms(phone: string): Promise<void> {
  confirmation = null;
  verificationId = null;

  if (Platform.OS === 'android') {
    try {
      auth().settings.forceRecaptchaFlowForTesting = false;
    } catch {
      // ignore
    }
    confirmation = await auth().signInWithPhoneNumber(phone, true);
    return;
  }

  await prepareIosApns();
  if (nativePhoneAuth?.verifyPhoneNumber) {
    verificationId = await nativePhoneAuth.verifyPhoneNumber(phone);
    return;
  }
  const snapshot = await waitForPhoneSnapshot(phone, true);
  if (!snapshot.verificationId) {
    throw Object.assign(new Error('FIREBASE_APP_VERIFY_FAILED'), {
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
  const raw = typeof err === 'object' && err && 'code' in err
    ? String((err as { code: unknown }).code)
    : '';
  const message = typeof err === 'object' && err && 'message' in err
    ? String((err as { message: unknown }).message)
    : '';
  const code = raw.startsWith('auth/')
    ? raw
    : (message.match(/auth\/[a-z0-9-]+/i)?.[0]?.toLowerCase() ?? raw);

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
