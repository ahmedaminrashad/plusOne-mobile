import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from '../i18n';

const ACCESS_TOKEN_KEY = 'plusone_access_token';
const REFRESH_TOKEN_KEY = 'plusone_refresh_token';
const LANGUAGE_KEY = 'plusone_language';
const ONBOARDING_SEEN_KEY = 'plusone_onboarding_seen';
const BIOMETRICS_KEY = 'plusone_biometrics_enabled';
const TWO_FACTOR_KEY = 'plusone_two_factor_enabled';
const LOGIN_ALERTS_KEY = 'plusone_login_alerts_enabled';

const KEYCHAIN_OPTS = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

export const SecureStorage = {
  async saveTokens(accessToken: string, refreshToken: string, isProfileComplete: boolean): Promise<void> {
    await Keychain.setGenericPassword(
      ACCESS_TOKEN_KEY,
      JSON.stringify({ accessToken, refreshToken, isProfileComplete }),
      KEYCHAIN_OPTS,
    );
  },

  async getTokens(): Promise<{ accessToken: string; refreshToken: string; isProfileComplete: boolean } | null> {
    // A locked-device / app-switcher keychain read can block the main thread
    // long enough for iOS to watchdog the whole phone (black spinner, then lock).
    const result = await withTimeout(Keychain.getGenericPassword(KEYCHAIN_OPTS), 800);
    if (!result) return null;
    try {
      const parsed = JSON.parse(result.password);
      return { ...parsed, isProfileComplete: parsed.isProfileComplete ?? false };
    } catch {
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword();
  },
};

export const AppStorage = {
  async getLanguage(): Promise<AppLanguage | null> {
    const value = await AsyncStorage.getItem(LANGUAGE_KEY);
    return value === 'ar' || value === 'en' ? value : null;
  },

  async setLanguage(language: AppLanguage): Promise<void> {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  },

  async hasSeenOnboarding(): Promise<boolean> {
    return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true';
  },

  async setHasSeenOnboarding(): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  },

  async getBiometricsEnabled(): Promise<boolean> {
    return (await AsyncStorage.getItem(BIOMETRICS_KEY)) === 'true';
  },

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(BIOMETRICS_KEY, enabled ? 'true' : 'false');
  },

  async getTwoFactorEnabled(): Promise<boolean> {
    return (await AsyncStorage.getItem(TWO_FACTOR_KEY)) === 'true';
  },

  async setTwoFactorEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(TWO_FACTOR_KEY, enabled ? 'true' : 'false');
  },

  async getLoginAlertsEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(LOGIN_ALERTS_KEY);
    return value !== 'false';
  },

  async setLoginAlertsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(LOGIN_ALERTS_KEY, enabled ? 'true' : 'false');
  },
};
