import { baseApi } from './baseApi';
import { AuthTokens } from '../../types/models';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendOtp: builder.mutation<{ message: string; cooldown: number }, { phone: string }>({
      query: (body) => ({ url: '/auth/otp/send', method: 'POST', body }),
    }),

    verifyOtp: builder.mutation<AuthTokens, { phone: string; code: string }>({
      query: (body) => ({ url: '/auth/otp/verify', method: 'POST', body }),
    }),

    refreshToken: builder.mutation<{ accessToken: string; refreshToken: string }, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', body }),
    }),

    logout: builder.mutation<void, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),
  }),
});

export const { useSendOtpMutation, useVerifyOtpMutation, useRefreshTokenMutation, useLogoutMutation } = authApi;
