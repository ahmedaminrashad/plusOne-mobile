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
let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshToken = (api.getState() as RootState).auth.refreshToken;
        if (!refreshToken) return false;

        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
          api,
          extraOptions,
        );
        if (!refreshResult.data) return false;

        const tokens = refreshResult.data as { accessToken: string; refreshToken: string };
        api.dispatch(setTokens(tokens));
        const stored = await SecureStorage.getTokens();
        await SecureStorage.saveTokens(tokens.accessToken, tokens.refreshToken, stored?.isProfileComplete ?? false);
        return true;
      })().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
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
  tagTypes: ['User', 'Group', 'GroupMember', 'Invitation', 'Bill', 'Share', 'Message'],
  endpoints: () => ({}),
});
