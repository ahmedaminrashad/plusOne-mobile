// Tracks which group's chat is currently on screen, so a foreground push
// notification for that same chat doesn't pop an alert over messages the
// user is already looking at (they arrive via the chat's own polling instead).
let activeChatGroupId: string | null = null;

export function setActiveChatGroupId(groupId: string | null) {
  activeChatGroupId = groupId;
}

export function isChatGroupActive(groupId: string): boolean {
  return activeChatGroupId === groupId;
}
