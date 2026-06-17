import { baseApi } from './baseApi';
import { Group, GroupMember } from '../../types/models';

export const groupsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query<Group[], void>({
      query: () => '/groups',
      providesTags: ['Group'],
    }),

    getGroup: builder.query<Group, string>({
      query: (id) => `/groups/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Group', id }],
    }),

    createGroup: builder.mutation<Group, { name: string; category?: string; avatarUrl?: string }>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      invalidatesTags: ['Group'],
    }),

    getGroupMembers: builder.query<GroupMember[], string>({
      query: (id) => `/groups/${id}/members`,
      providesTags: (_r, _e, id) => [{ type: 'GroupMember', id }],
    }),

    inviteMembers: builder.mutation<{ sent: number; failed: number; alreadyMembers: number }, { groupId: string; phones: string[] }>({
      query: ({ groupId, phones }) => ({
        url: `/groups/${groupId}/members`,
        method: 'POST',
        body: { phones },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'GroupMember', id: groupId }],
    }),

    removeMember: builder.mutation<void, { groupId: string; memberId: string }>({
      query: ({ groupId, memberId }) => ({
        url: `/groups/${groupId}/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'GroupMember', id: groupId }],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useGetGroupMembersQuery,
  useInviteMembersMutation,
  useRemoveMemberMutation,
} = groupsApi;
