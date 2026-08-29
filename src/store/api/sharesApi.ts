import { baseApi } from './baseApi';
import { Share, ShareMethod, Bill, Group } from '../../types/models';

export interface MyShare extends Share {
  bill: Bill | null;
  group: Group | null;
}

export const sharesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBillShares: builder.query<Share[], string>({
      query: (billId) => `/shares/bill/${billId}`,
      providesTags: (result, error, billId) => [{ type: 'Share', id: billId }],
    }),
    getMyShares: builder.query<MyShare[], void>({
      query: () => '/shares/mine',
      providesTags: ['Share'],
    }),
    payShare: builder.mutation<Share, { shareId: string; method?: ShareMethod }>({
      query: ({ shareId, method }) => ({ url: `/shares/${shareId}/pay`, method: 'POST', body: { method } }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'Share', id: result.billId },
              'Share',
              { type: 'Bill', id: result.billId },
              'Bill',
              { type: 'Ledger', id: result.groupId },
              'Ledger',
              { type: 'Message', id: result.groupId },
            ]
          : ['Share', 'Bill', 'Ledger'],
    }),
    cancelShareInitiation: builder.mutation<Share, string>({
      query: (shareId) => ({ url: `/shares/${shareId}/cancel-initiation`, method: 'POST' }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'Share', id: result.billId },
              'Share',
              { type: 'Bill', id: result.billId },
              'Bill',
              { type: 'Ledger', id: result.groupId },
            ]
          : ['Share', 'Bill', 'Ledger'],
    }),
    confirmShare: builder.mutation<Share, string>({
      query: (shareId) => ({ url: `/shares/${shareId}/confirm`, method: 'POST' }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'Share', id: result.billId },
              'Share',
              { type: 'Bill', id: result.billId },
              'Bill',
              { type: 'Ledger', id: result.groupId },
              'Ledger',
              { type: 'Message', id: result.groupId },
            ]
          : ['Share', 'Bill', 'Ledger', 'Message'],
    }),
    sendShareReminder: builder.mutation<{ sent: boolean; rateLimited: boolean }, string>({
      query: (shareId) => ({ url: `/shares/${shareId}/remind`, method: 'POST' }),
      invalidatesTags: ['Share'],
    }),
    remindAllPending: builder.mutation<{ sent: number; skipped: number }, string>({
      query: (billId) => ({ url: `/shares/bill/${billId}/remind-all`, method: 'POST' }),
      invalidatesTags: ['Share'],
    }),
    issuePayLink: builder.mutation<{ url: string; message: string; token: string }, string>({
      query: (shareId) => ({ url: `/shares/${shareId}/pay-link`, method: 'POST' }),
      invalidatesTags: ['Share', 'Bill'],
    }),
  }),
});

export const {
  useGetBillSharesQuery,
  useGetMySharesQuery,
  usePayShareMutation,
  useCancelShareInitiationMutation,
  useConfirmShareMutation,
  useSendShareReminderMutation,
  useRemindAllPendingMutation,
  useIssuePayLinkMutation,
} = sharesApi;
