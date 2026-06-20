import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
  AddBill: { groupId: string; groupName: string; receiptPhotoUri?: string };
  QRScanner: { groupId: string; groupName: string };
  ReceiptSplit: { groupId: string; groupName: string; receiptJson: string };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type AppScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;
