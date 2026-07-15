import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from '../i18n';

const ACCESS_TOKEN_KEY = 'plusone_access_token';
const REFRESH_TOKEN_KEY = 'plusone_refresh_token';
const LANGUAGE_KEY = 'plusone_language';

export const SecureStorage = {
  async saveTokens(accessToken: string, refreshToken: string, isProfileComplete: boolean): Promise<void> {
    await Keychain.setGenericPassword(ACCESS_TOKEN_KEY, JSON.stringify({ accessToken, refreshToken, isProfileComplete }));
  },

  async getTokens(): Promise<{ accessToken: string; refreshToken: string; isProfileComplete: boolean } | null> {
    const result = await Keychain.getGenericPassword();
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
};
