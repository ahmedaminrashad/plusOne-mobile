import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { PrefilledBillData } from './models';

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: undefined;
  OTPVerification: { phone: string };
  ProfileSetup: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Invitations: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; groupName: string };
  InviteMembers: { groupId: string };
  Chat: { groupId: string; groupName: string };
  AddBill: { groupId: string; groupName: string; receiptPhotoUri?: string; prefilledData?: PrefilledBillData };
  QRScanner: { groupId: string; groupName: string };
  OCRCapture: { groupId: string; groupName: string };
  ReceiptSplit: { groupId: string; groupName: string; receiptJson: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
  EditProfile: undefined;
  SecuritySettings: undefined;
  PaymentMethods: undefined;
};

export type TabParamList = {
  Groups: undefined;
  NewGroup: undefined;
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
