import { baseApi } from './baseApi';
import { Share } from '../../types/models';

export const sharesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBillShares: builder.query<Share[], string>({
      query: (billId) => `/shares/bill/${billId}`,
      providesTags: (result, error, billId) => [{ type: 'Share', id: billId }],
    }),
    payShare: builder.mutation<Share, string>({
      query: (shareId) => ({ url: `/shares/${shareId}/pay`, method: 'POST' }),
      invalidatesTags: (result) => (result ? [{ type: 'Share', id: result.billId }] : []),
    }),
    cancelShareInitiation: builder.mutation<Share, string>({
      query: (shareId) => ({ url: `/shares/${shareId}/cancel-initiation`, method: 'POST' }),
      invalidatesTags: (result) => (result ? [{ type: 'Share', id: result.billId }] : []),
    }),
  }),
});

export const {
  useGetBillSharesQuery,
  usePayShareMutation,
  useCancelShareInitiationMutation,
} = sharesApi;
