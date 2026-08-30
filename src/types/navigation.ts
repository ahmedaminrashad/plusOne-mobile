import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { PrefilledBillData } from './models';

export type AuthStackParamList = {
  Onboarding: undefined;
  PhoneEntry: undefined;
  OTPVerification: { phone: string; firebaseSmsSent?: boolean };
  ProfileSetup: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Notifications: undefined;
  Invitations: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; groupName: string; initialTab?: 'chat' | 'bills' | 'ledger' | 'members' };
  InviteMembers: { groupId: string };
  Chat: { groupId: string; groupName: string; sharedImageUri?: string };
  SelectGroupToShare: { imageUri: string };
  /** Pick a group for a new receipt, or after the bill/receipt is ready. */
  SelectGroupForBill: { receiptJson?: string } | undefined;
  AddBillChooser: { groupId?: string; groupName?: string };
  AddBill: { groupId?: string; groupName?: string; prefilledData?: PrefilledBillData };
  QRScanner: { groupId?: string; groupName?: string };
  OCRCapture: { groupId?: string; groupName?: string };
  AssignItems: { groupId: string; groupName: string; receiptJson: string };
  BillStatus: { groupId: string; groupName: string; billId: string };
  PayShare: { groupId: string; groupName: string; billId: string };
  EditBillItems: { groupId: string; groupName: string; billId: string };
  AllGroups: undefined;
  SettleUp: undefined;
  MyCircle: undefined;
  Remind: undefined;
  MyLedger: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  EditProfile: { prefillInstaPayAlias?: string } | undefined;
  SecuritySettings: undefined;
  PaymentMethods: undefined;
};

export type TabParamList = {
  Home: undefined;
  QuickAdd: undefined;
  SettingsTab: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type AppScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;

export type SettingsScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;
