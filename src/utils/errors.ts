import i18n from '../i18n';
import { mapFirebaseAuthError } from '../services/firebasePhoneAuth';

// Backend exceptions carry a stable code string (e.g. "OTP_INVALID") instead of
// display text — this resolves it to the current-language translation, via the
// `errors` namespace, falling back to a generic message for unrecognized codes.
export function resolveErrorMessage(err: any): string {
  if (typeof err?.code === 'string' && err.code.startsWith('auth/')) {
    const mapped = mapFirebaseAuthError(err);
    if (i18n.exists(`errors:${mapped}`)) return i18n.t(`errors:${mapped}`);
  }

  const raw = err?.data?.message?.message ?? err?.data?.message?.error ?? err?.data?.message;
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (typeof code === 'string' && i18n.exists(`errors:${code}`)) {
    return i18n.t(`errors:${code}`);
  }
  return i18n.t('errors:GENERIC');
}
