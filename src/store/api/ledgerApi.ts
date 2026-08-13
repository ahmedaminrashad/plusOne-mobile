import { baseApi } from './baseApi';

export interface CounterpartBreakdown {
  counterpartUserId: string | null;
  counterpartPendingPhone: string | null;
  counterpartName: string;
  netAmountPiastres: number;
  direction: 'owes_you' | 'you_owe';
}

export interface LedgerBillSummary {
  id: string;
  title: string | null;
  amountPiastres: number;
  createdAt: string;
  aggregateStatus: 'fully_settled' | 'partially_settled' | 'pending' | 'voided';
}

export interface GroupLedgerResponse {
  groupMonthlyTotal: number;
  youPaidPiastres: number;
  yourSharePiastres: number;
  currentUserNetBalance: number;
  perCounterpartBreakdown: CounterpartBreakdown[];
  bills: LedgerBillSummary[];
  computedAt: string;
}

export const ledgerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGroupLedger: builder.query<GroupLedgerResponse, string>({
      query: (groupId) => `/ledger/group/${groupId}`,
      providesTags: (_r, _e, groupId) => [{ type: 'Ledger', id: groupId }],
    }),
  }),
});

export const { useGetGroupLedgerQuery } = ledgerApi;
