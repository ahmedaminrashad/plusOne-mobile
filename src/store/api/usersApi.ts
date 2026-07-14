import { baseApi } from './baseApi';
import { User } from '../../types/models';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<User, { displayName?: string; photoUrl?: string; instaPayAlias?: string }>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['User', 'Bill'],
    }),

    saveFcmToken: builder.mutation<void, string>({
      query: (fcmToken) => ({ url: '/users/me/fcm-token', method: 'PATCH', body: { fcmToken } }),
    }),

    saveLanguage: builder.mutation<void, 'ar' | 'en'>({
      query: (language) => ({ url: '/users/me/language', method: 'PATCH', body: { language } }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateProfileMutation,
  useSaveFcmTokenMutation,
  useSaveLanguageMutation,
} = usersApi;
