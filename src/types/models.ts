export interface User {
  id: string;
  phone: string;
  displayName: string | null;
  photoUrl: string | null;
  instaPayAlias: string | null;
  isProfileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GroupCategory = 'friends' | 'family' | 'work' | 'travel' | 'other';
export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'active' | 'pending' | 'removed';
export type CaptureMethod = 'qr' | 'manual' | 'ocr';
export type TaxServiceType = 'percent' | 'amount';

export interface BillLineItem {
  name: string;
  qty: number;
  unitPrice: number;
  claimedBy?: string[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string | null;
  pendingPhone: string | null;
  role: MemberRole;
  status: MemberStatus;
  user: User | null;
  group?: Group;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  category: GroupCategory | null;
  avatarUrl: string | null;
  members: GroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  isProfileComplete: boolean;
}

export interface Bill {
  id: string;
  groupId: string;
  title: string | null;
  amount: number;
  currency: string;
  paidByUserId: string;
  paidBy: User | null;
  notes: string | null;
  receiptPhotoUrl: string | null;
  captureMethod: CaptureMethod;
  sourceRef: string | null;
  venueName: string | null;
  lineItems: BillLineItem[] | null;
  tax: number | null;
  taxType: TaxServiceType | null;
  delivery: number | null;
  deliveryType: TaxServiceType | null;
  vat: number | null;
  vatType: TaxServiceType | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ShareStatus =
  | 'pending'
  | 'initiated'
  | 'settled'
  | 'cancelled'
  | 'failed'
  | 'link_sent'
  | 'link_opened'
  | 'pending_confirmation';
export type ShareMethod = 'instapay' | 'cash';

export interface Share {
  id: string;
  billId: string;
  groupId: string;
  initiatorUserId: string;
  initiator: User | null;
  ownerUserId: string | null;
  owner: User | null;
  ownerPendingPhone: string | null;
  amountPiastres: number;
  currency: string;
  status: ShareStatus;
  method: ShareMethod;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillMessageSummary {
  id: string;
  title: string | null;
  amount: number;
  currency: string;
  paidByUserId: string;
  paidByName: string | null;
  itemCount: number;
  closedAt: string | null;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  text: string | null;
  imageUrl: string | null;
  billId: string | null;
  bill: BillMessageSummary | null;
  createdAt: string;
}

export interface ApiError {
  statusCode: number;
  message: string | { error: string };
}

/** Pre-filled bill data passed from QR / OCR flows into AddBill screen */
export interface PrefilledBillData {
  venueName?: string;
  lineItems?: BillLineItem[];
  tax?: number;
  taxType?: TaxServiceType;
  delivery?: number;
  deliveryType?: TaxServiceType;
  vat?: number;
  vatType?: TaxServiceType;
  grandTotal?: number;
  captureMethod?: CaptureMethod;
  sourceRef?: string;
}

/** Extended receipt format passed to the AssignItems screen */
export interface ParsedReceiptData {
  storeName?: string;
  venueName?: string;
  items: { id?: string; name: string; price: number; qty?: number }[];
  tax?: number;
  taxType?: TaxServiceType;
  delivery?: number;
  deliveryType?: TaxServiceType;
  vat?: number;
  vatType?: TaxServiceType;
  grandTotal?: number;
  captureMethod?: CaptureMethod;
  sourceRef?: string;
  receiptPhotoUrl?: string;
}
