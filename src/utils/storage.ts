import * as Keychain from 'react-native-keychain';

const ACCESS_TOKEN_KEY = 'plusone_access_token';
const REFRESH_TOKEN_KEY = 'plusone_refresh_token';

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
