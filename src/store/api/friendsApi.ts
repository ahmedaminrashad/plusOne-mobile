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
}

export const friendsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyCircle: builder.query<Friend[], void>({
      query: () => '/friends',
      providesTags: ['Friend'],
    }),
    addFriend: builder.mutation<Friend, { phone: string; displayName?: string }>({
      query: (body) => ({ url: '/friends', method: 'POST', body }),
      invalidatesTags: ['Friend'],
    }),
    removeFriend: builder.mutation<void, string>({
      query: (friendId) => ({ url: `/friends/${friendId}`, method: 'DELETE' }),
      invalidatesTags: ['Friend'],
    }),
  }),
});

export const { useGetMyCircleQuery, useAddFriendMutation, useRemoveFriendMutation } = friendsApi;
