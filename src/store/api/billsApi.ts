import { baseApi } from './baseApi';
import { Bill, BillLineItem, CaptureMethod, TaxServiceType } from '../../types/models';

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
  useCreateBillMutation,
  useDeleteBillMutation,
  useParseQrBillMutation,
} = billsApi;
