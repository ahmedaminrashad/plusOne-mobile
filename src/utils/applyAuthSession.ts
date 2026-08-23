import { AuthTokens } from '../types/models';
import { SecureStorage } from './storage';
import { setTokens, setProfileComplete } from '../store/slices/authSlice';
import type { AppDispatch } from '../store';

export async function applyAuthSession(result: AuthTokens, dispatch: AppDispatch): Promise<void> {
  await SecureStorage.saveTokens(result.accessToken, result.refreshToken, result.isProfileComplete);
  dispatch(setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken }));
  dispatch(setProfileComplete(result.isProfileComplete));
}
