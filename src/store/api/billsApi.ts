import { baseApi } from './baseApi';
import { Bill, BillLineItem, CaptureMethod, TaxServiceType, Share } from '../../types/models';

export interface BillDetail extends Bill {
  shares: Share[];
  aggregateStatus: 'fully_settled' | 'partially_settled' | 'pending' | 'voided';
  isEditable: boolean;
}

interface CreateSharePayload {
  groupMemberId: string;
  amountPiastres: number;
}

interface UpdateBillItemsPayload {
  billId: string;
  lineItems: BillLineItem[];
  shares: CreateSharePayload[];
}

interface CreateBillPayload {
  groupId: string;
  title?: string;
  amount: number;
  currency?: string;
  paidByUserId: string;
  notes?: string;
  receiptPhotoUrl?: string;
  captureMethod?: CaptureMethod;
  sourceRef?: string;
  venueName?: string;
  lineItems?: BillLineItem[];
  tax?: number;
  taxType?: TaxServiceType;
  service?: number;
  serviceType?: TaxServiceType;
  tip?: number;
  tipType?: TaxServiceType;
  shares?: CreateSharePayload[];
}

interface ParseQrPayload {
  groupId: string;
  payload: string;
}

interface ParsedBillResult {
  success: boolean;
  bill?: {
    venueName?: string;
    lineItems: BillLineItem[];
    subtotal?: number;
    tax?: number;
    taxType?: TaxServiceType;
    service?: number;
    serviceType?: TaxServiceType;
    captureMethod: 'qr';
    sourceRef: string;
  };
  fallback?: 'webview' | 'manual';
  url?: string;
  reason?: string;
}

export const billsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGroupBills: builder.query<Bill[], string>({
      query: (groupId) => `/bills/group/${groupId}`,
      providesTags: ['Bill'],
    }),
    getBillDetail: builder.query<BillDetail, string>({
      query: (billId) => `/bills/${billId}`,
      providesTags: (result, error, billId) => [{ type: 'Bill', id: billId }, 'Bill'],
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
    updateBillItems: builder.mutation<BillDetail, UpdateBillItemsPayload>({
      query: ({ billId, ...body }) => ({
        url: `/bills/${billId}/items`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { billId }) => [{ type: 'Bill', id: billId }, 'Bill'],
    }),
    closeBill: builder.mutation<Bill, string>({
      query: (billId) => ({ url: `/bills/${billId}/close`, method: 'POST' }),
      invalidatesTags: (result, error, billId) => [{ type: 'Bill', id: billId }, 'Bill'],
    }),
    parseQrBill: builder.mutation<ParsedBillResult, ParseQrPayload>({
      query: ({ groupId, payload }) => ({
        url: `/bills/group/${groupId}/parse-qr`,
        method: 'POST',
        body: { payload },
      }),
    }),
  }),
});

export const {
  useGetGroupBillsQuery,
  useGetBillDetailQuery,
  useCreateBillMutation,
  useDeleteBillMutation,
  useUpdateBillItemsMutation,
  useCloseBillMutation,
  useParseQrBillMutation,
} = billsApi;
