export function isGhostMember(m: { userId?: string | null; pendingPhone?: string | null }): boolean {
  return !m.userId && !!m.pendingPhone;
}

export function isGhostFriend(f: { friendUserId?: string | null }): boolean {
  return !f.friendUserId;
}

export function isGhostShare(s: { ownerUserId?: string | null }): boolean {
  return !s.ownerUserId;
}
