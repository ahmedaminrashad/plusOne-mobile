import { baseApi } from './baseApi';
import { User } from '../../types/models';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<User, { displayName?: string; instaPayAlias?: string }>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['User', 'Bill'],
    }),

    uploadProfilePhoto: builder.mutation<{ url: string }, { uri: string; fileName?: string; mimeType?: string }>({
      query: ({ uri, fileName, mimeType }) => {
        const formData = new FormData();
        formData.append('photo', {
          uri,
          name: fileName ?? 'profile-photo.jpg',
          type: mimeType ?? 'image/jpeg',
        } as unknown as Blob);
        return { url: '/users/me/photo', method: 'POST', body: formData };
      },
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
  useUploadProfilePhotoMutation,
  useSaveFcmTokenMutation,
  useSaveLanguageMutation,
} = usersApi;
