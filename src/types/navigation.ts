import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: undefined;
  OTPVerification: { phone: string };
  ProfileSetup: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; groupName: string };
  InviteMembers: { groupId: string };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type AppScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;
