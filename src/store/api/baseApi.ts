import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_BASE_URL } from '../../config';
import { setTokens, clearAuth } from '../slices/authSlice';
import { SecureStorage } from '../../utils/storage';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// Access tokens are short-lived (15m). On a 401, try exactly one refresh-and-retry
// before giving up and logging the user out — concurrent 401s share the same
// in-flight refresh instead of each firing their own.
type RefreshOutcome = 'ok' | 'transient' | 'invalid';

let refreshPromise: Promise<RefreshOutcome> | null = null;
let authGraceUntil = 0;

/** After a successful login, ignore a brief 401 storm instead of bouncing to phone entry. */
export function markAuthGrace(ms = 12_000): void {
  authGraceUntil = Date.now() + ms;
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    if (!refreshPromise) {
      refreshPromise = (async (): Promise<RefreshOutcome> => {
        const refreshToken = (api.getState() as RootState).auth.refreshToken;
        if (!refreshToken) return 'invalid';

        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
          api,
          extraOptions,
        );
        if (refreshResult.data) {
          const tokens = refreshResult.data as { accessToken: string; refreshToken: string };
          api.dispatch(setTokens(tokens));
          const stored = await SecureStorage.getTokens();
          await SecureStorage.saveTokens(tokens.accessToken, tokens.refreshToken, stored?.isProfileComplete ?? false);
          return 'ok';
        }
        const status = refreshResult.error?.status;
        if (status === 401 || status === 403) return 'invalid';
        return 'transient';
      })().finally(() => {
        refreshPromise = null;
      });
    }

    const outcome = await refreshPromise;
    if (outcome === 'ok') {
      result = await rawBaseQuery(args, api, extraOptions);
    } else if (outcome === 'transient' || Date.now() < authGraceUntil) {
      // Network blip after Home / lock — do not bounce to phone entry.
    } else {
      api.dispatch(clearAuth());
      await SecureStorage.clearTokens();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Group', 'GroupMember', 'Invitation', 'Bill', 'Share', 'Message', 'Ledger', 'Friend'],
  endpoints: () => ({}),
});
