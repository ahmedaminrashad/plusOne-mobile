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
  tax?: number | null;
  taxType?: TaxServiceType | null;
  delivery?: number | null;
  deliveryType?: TaxServiceType | null;
  vat?: number | null;
  vatType?: TaxServiceType | null;
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
  delivery?: number;
  deliveryType?: TaxServiceType;
  vat?: number;
  vatType?: TaxServiceType;
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
    delivery?: number;
    deliveryType?: TaxServiceType;
    captureMethod: 'qr' | 'ocr';
    sourceRef: string;
  };
  fallback?: 'webview' | 'manual';
  url?: string;
  reason?: string;
}

interface ParseReceiptPayload {
  groupId: string;
  uri: string;
  fileName?: string;
  mimeType?: string;
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
      // Creating a bill also shares it into the group chat as a message, so refresh that feed too.
      invalidatesTags: ['Bill', 'Message'],
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
    parseReceiptBill: builder.mutation<ParsedBillResult, ParseReceiptPayload>({
      query: ({ groupId, uri, fileName, mimeType }) => {
        const formData = new FormData();
        formData.append('image', {
          uri,
          name: fileName ?? 'receipt.jpg',
          type: mimeType ?? 'image/jpeg',
        } as unknown as Blob);
        return {
          url: `/bills/group/${groupId}/parse-receipt`,
          method: 'POST',
          body: formData,
        };
      },
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
  useParseReceiptBillMutation,
} = billsApi;
