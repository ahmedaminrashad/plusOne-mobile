import { baseApi } from './baseApi';
import { User } from '../../types/models';

export type FriendStatus = 'active' | 'pending';

export interface Friend {
  id: string;
  ownerUserId: string;
  friendUserId: string | null;
  friend: User | null;
  pendingPhone: string | null;
  displayName: string | null;
  status: FriendStatus;
  createdAt: string;
  onPlusOne?: boolean;
  created?: boolean;
  shareText?: string;
  shareUrl?: string;
}

export const friendsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyCircle: builder.query<Friend[], void>({
      query: () => '/friends',
      providesTags: ['Friend'],
    }),
    lookupPhones: builder.mutation<{ registered: string[] }, string[]>({
      query: (phones) => ({ url: '/friends/lookup', method: 'POST', body: { phones } }),
    }),
    addFriend: builder.mutation<Friend, { phone: string; displayName?: string }>({
      query: (body) => ({ url: '/friends', method: 'POST', body }),
      invalidatesTags: ['Friend'],
    }),
    shareFriendInvite: builder.mutation<Friend, string>({
      query: (friendId) => ({ url: `/friends/${friendId}/share`, method: 'POST' }),
    }),
    removeFriend: builder.mutation<void, string>({
      query: (friendId) => ({ url: `/friends/${friendId}`, method: 'DELETE' }),
      invalidatesTags: ['Friend'],
    }),
  }),
});

export const {
  useGetMyCircleQuery,
  useLookupPhonesMutation,
  useAddFriendMutation,
  useShareFriendInviteMutation,
  useRemoveFriendMutation,
} = friendsApi;
