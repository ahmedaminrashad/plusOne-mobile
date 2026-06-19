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

export interface ApiError {
  statusCode: number;
  message: string | { error: string };
}
