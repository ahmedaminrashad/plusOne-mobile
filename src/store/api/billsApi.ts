import { baseApi } from './baseApi';
import { Bill } from '../../types/models';

interface CreateBillPayload {
  groupId: string;
  title: string;
  amount: number;
  currency?: string;
  paidByUserId: string;
  notes?: string;
  receiptPhotoUrl?: string;
}

export const billsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGroupBills: builder.query<Bill[], string>({
      query: (groupId) => `/bills/group/${groupId}`,
      providesTags: ['Bill'],
    }),
    createBill: builder.mutation<Bill, CreateBillPayload>({
      query: ({ groupId, ...body }) => ({
        url: `/bills/group/${groupId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bill'],
    }),
    deleteBill: builder.mutation<void, string>({
      query: (billId) => ({ url: `/bills/${billId}`, method: 'DELETE' }),
      invalidatesTags: ['Bill'],
    }),
  }),
});

export const {
  useGetGroupBillsQuery,
  useCreateBillMutation,
  useDeleteBillMutation,
} = billsApi;
