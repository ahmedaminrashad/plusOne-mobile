import { baseApi } from './baseApi';
import { Group, GroupMember, ChatMessage } from '../../types/models';

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

    updateGroup: builder.mutation<Group, { groupId: string; name: string }>({
      query: ({ groupId, name }) => ({
        url: `/groups/${groupId}`,
        method: 'PATCH',
        body: { name },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'Group', id: groupId }, 'Group'],
    }),

    deleteGroup: builder.mutation<void, string>({
      query: (groupId) => ({ url: `/groups/${groupId}`, method: 'DELETE' }),
      invalidatesTags: ['Group', 'GroupMember', 'Invitation', 'Message', 'Bill', 'Share', 'Ledger'],
    }),

    getGroupMembers: builder.query<GroupMember[], string>({
      query: (id) => `/groups/${id}/members`,
      providesTags: (_r, _e, id) => [{ type: 'GroupMember', id }],
    }),

    inviteMembers: builder.mutation<
      {
        sent: number;
        failed: number;
        alreadyMembers: number;
        sharePayloads?: { phone: string; shareText: string; shareUrl: string }[];
      },
      { groupId: string; phones: string[]; names?: string[] }
    >({
      query: ({ groupId, phones, names }) => ({
        url: `/groups/${groupId}/members`,
        method: 'POST',
        body: { phones, names },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: 'GroupMember', id: groupId },
        { type: 'Group', id: groupId },
        'Group',
      ],
    }),

    removeMember: builder.mutation<void, { groupId: string; memberId: string }>({
      query: ({ groupId, memberId }) => ({
        url: `/groups/${groupId}/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: 'GroupMember', id: groupId },
        { type: 'Group', id: groupId },
        'Group',
      ],
    }),

    getMyInvitations: builder.query<GroupMember[], void>({
      query: () => '/groups/invitations',
      providesTags: ['Invitation'],
    }),

    acceptInvitation: builder.mutation<void, string>({
      query: (membershipId) => ({
        url: `/groups/invitations/${membershipId}/accept`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Invitation', 'Group', 'GroupMember'],
    }),

    declineInvitation: builder.mutation<void, string>({
      query: (membershipId) => ({
        url: `/groups/invitations/${membershipId}/decline`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Invitation'],
    }),

    getGroupMessages: builder.query<ChatMessage[], { groupId: string; limit: number }>({
      query: ({ groupId, limit }) => `/groups/${groupId}/messages?limit=${limit}`,
      providesTags: (_r, _e, { groupId }) => [{ type: 'Message', id: groupId }],
    }),

    sendGroupMessage: builder.mutation<ChatMessage, { groupId: string; text?: string; imageUrl?: string }>({
      query: ({ groupId, text, imageUrl }) => ({
        url: `/groups/${groupId}/messages`,
        method: 'POST',
        body: { text, imageUrl },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'Message', id: groupId }],
    }),

    uploadChatImage: builder.mutation<{ url: string }, { groupId: string; uri: string; fileName?: string; mimeType?: string }>({
      query: ({ groupId, uri, fileName, mimeType }) => {
        const formData = new FormData();
        formData.append('image', {
          uri,
          name: fileName ?? 'chat-image.jpg',
          type: mimeType ?? 'image/jpeg',
        } as unknown as Blob);
        return { url: `/groups/${groupId}/chat-image`, method: 'POST', body: formData };
      },
    }),

    uploadGroupAvatar: builder.mutation<{ url: string }, { groupId: string; uri: string; fileName?: string; mimeType?: string }>({
      query: ({ groupId, uri, fileName, mimeType }) => {
        const formData = new FormData();
        formData.append('image', {
          uri,
          name: fileName ?? 'group-avatar.jpg',
          type: mimeType ?? 'image/jpeg',
        } as unknown as Blob);
        return { url: `/groups/${groupId}/avatar`, method: 'POST', body: formData };
      },
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'Group', id: groupId }, 'Group'],
    }),
  }),
});

export const {
  useGetGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useGetGroupMembersQuery,
  useInviteMembersMutation,
  useRemoveMemberMutation,
  useGetMyInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useGetGroupMessagesQuery,
  useSendGroupMessageMutation,
  useUploadChatImageMutation,
  useUploadGroupAvatarMutation,
} = groupsApi;
