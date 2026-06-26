import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { AppScreenProps } from '../../types/navigation';
import { useGetGroupMembersQuery, useRemoveMemberMutation, useSendChatNotificationMutation } from '../../store/api/groupsApi';
import { useGetGroupBillsQuery, useDeleteBillMutation } from '../../store/api/billsApi';
import { GroupMember, MemberRole, Bill } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { useGetMeQuery } from '../../store/api/usersApi';

type Props = AppScreenProps<'GroupDetail'>;
type Tab = 'chat' | 'bills' | 'members';

// ──────────────────────────────────────────────────────────────
// Chat types
// ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
  _pending?: boolean;
  _failed?: boolean;
}

const CHAT_PAGE = 30;

function formatMsgTime(ts: FirebaseFirestoreTypes.Timestamp | null): string {
  if (!ts) return '';
  const date = ts.toDate();
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `منذ ${diffMin} د`;
    return `منذ ${Math.floor(diffMin / 60)} س`;
  }
  return (
    date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) +
    ' ' +
    date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  );
}

// ──────────────────────────────────────────────────────────────
// Member row
// ──────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isAdmin,
  isSelf,
  onRemove,
}: {
  member: GroupMember;
  isAdmin: boolean;
  isSelf: boolean;
  onRemove: () => void;
}) {
  const name = member.user?.displayName ?? member.pendingPhone ?? 'مستخدم';
  const isPending = member.status === 'pending';
  return (
    <View style={styles.memberRow}>
      <Avatar uri={member.user?.photoUrl} name={name} size={42} />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{name}</Text>
          {member.role === 'admin' && (
            <View style={styles.adminBadge}><Text style={styles.adminText}>مسؤول</Text></View>
          )}
          {isPending && (
            <View style={styles.pendingBadge}><Text style={styles.pendingText}>قيد الانتظار</Text></View>
          )}
        </View>
        <Text style={styles.memberPhone}>{member.user?.phone ?? member.pendingPhone ?? ''}</Text>
      </View>
      {isAdmin && !isSelf && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeText}>إزالة</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Bill card
// ──────────────────────────────────────────────────────────────

function BillCard({
  bill,
  onDelete,
  canDelete,
}: {
  bill: Bill;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const payerName = bill.paidBy?.displayName ?? 'مستخدم';
  const date = new Date(bill.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  const displayName = bill.venueName ?? bill.title ?? 'فاتورة';
  return (
    <View style={styles.billCard}>
      <View style={styles.billIcon}>
        <Text style={styles.billIconText}>🧾</Text>
      </View>
      <View style={styles.billInfo}>
        <Text style={styles.billTitle}>{displayName}</Text>
        <Text style={styles.billMeta}>دفع {payerName} • {date}</Text>
      </View>
      <View style={styles.billRight}>
        <Text style={styles.billAmount}>{Number(bill.amount).toFixed(2)}</Text>
        <Text style={styles.billCurrency}>{bill.currency}</Text>
        {canDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.billDelete}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Chat bubble
// ──────────────────────────────────────────────────────────────

function ChatBubble({
  msg,
  isMine,
  showSender,
  onRetry,
}: {
  msg: ChatMessage;
  isMine: boolean;
  showSender: boolean;
  onRetry: (m: ChatMessage) => void;
}) {
  const timeStr = msg._pending ? 'إرسال...' : msg._failed ? 'فشل' : formatMsgTime(msg.createdAt);
  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      {!isMine && (
        <View style={styles.avatarCol}>
          {showSender ? (
            <Avatar uri={msg.senderPhoto} name={msg.senderName} size={32} />
          ) : (
            <View style={styles.avatarSpacer} />
          )}
        </View>
      )}
      <View style={styles.bubbleCol}>
        {!isMine && showSender && (
          <Text style={styles.senderName}>{msg.senderName}</Text>
        )}
        <TouchableOpacity
          activeOpacity={msg._failed ? 0.6 : 1}
          onPress={msg._failed ? () => onRetry(msg) : undefined}>
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            msg._failed && styles.bubbleFailed,
          ]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.text}</Text>
            <Text style={[
              styles.bubbleTime,
              isMine && styles.bubbleTimeMine,
              msg._failed && styles.bubbleTimeFailed,
            ]}>
              {msg._failed ? '⚠ ' : ''}{timeStr}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────────────────────

function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId, groupName } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const { data: members, isLoading, refetch } = useGetGroupMembersQuery(groupId);
  const { data: bills, isLoading: billsLoading } = useGetGroupBillsQuery(groupId, {
    skip: activeTab !== 'bills',
  });
  const [removeMember] = useRemoveMemberMutation();
  const [deleteBill] = useDeleteBillMutation();
  const { data: me } = useGetMeQuery();
  const [sendChatNotification] = useSendChatNotificationMutation();

  const myMembership = members?.find((m) => m.userId === me?.id);
  const isAdmin = myMembership?.role === 'admin';

  // ── Chat state ──────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const chatListRef = useRef<FlatList>(null);

  const messagesRef = firestore()
    .collection('groupChats')
    .doc(groupId)
    .collection('messages');

  useEffect(() => {
    const unsub = messagesRef
      .orderBy('createdAt', 'desc')
      .limit(CHAT_PAGE)
      .onSnapshot(
        (snap) => {
          const msgs: ChatMessage[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ChatMessage, 'id'>),
          }));
          setChatMessages((prev) => {
            const realIds = new Set(snap.docs.map((d) => d.id));
            const pending = prev.filter((m) => (m._pending || m._failed) && !realIds.has(m.id));
            return [...pending, ...msgs];
          });
          if (snap.docs.length > 0) lastDocRef.current = snap.docs[snap.docs.length - 1];
          setHasMore(snap.docs.length >= CHAT_PAGE);
          setChatLoading(false);
        },
        () => setChatLoading(false),
      );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const snap = await messagesRef
        .orderBy('createdAt', 'desc')
        .startAfter(lastDocRef.current)
        .limit(CHAT_PAGE)
        .get();
      if (snap.docs.length === 0) { setHasMore(false); return; }
      lastDocRef.current = snap.docs[snap.docs.length - 1];
      const older: ChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id'>),
      }));
      setChatMessages((prev) => [...prev, ...older]);
      setHasMore(snap.docs.length >= CHAT_PAGE);
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, groupId]);

  const doSendMessage = useCallback(async (trimmed: string) => {
    if (!me) return;
    const tempId = `pending-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: me.id,
      senderName: me.displayName ?? 'مستخدم',
      senderPhoto: me.photoUrl ?? null,
      text: trimmed,
      createdAt: null,
      _pending: true,
    };
    setChatMessages((prev) => [optimistic, ...prev]);
    try {
      await messagesRef.add({
        senderId: me.id,
        senderName: me.displayName ?? 'مستخدم',
        senderPhoto: me.photoUrl ?? null,
        text: trimmed,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
      const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
      sendChatNotification({
        groupId,
        senderName: me.displayName ?? 'مستخدم',
        messagePreview: preview,
      }).catch(() => {});
    } catch {
      setChatMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _pending: false, _failed: true } : m)),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, groupId, sendChatNotification]);

  const handleChatSend = useCallback(() => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
    setChatText('');
    doSendMessage(trimmed);
  }, [chatText, doSendMessage]);

  const handleChatRetry = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => prev.filter((m) => m.id !== msg.id));
    doSendMessage(msg.text);
  }, [doSendMessage]);

  // ── Bills actions ───────────────────────────────────────────

  const handleScanQR = useCallback(() => {
    navigation.navigate('QRScanner', { groupId, groupName });
  }, [groupId, groupName, navigation]);

  const handleScanOCR = useCallback(() => {
    navigation.navigate('OCRCapture', { groupId, groupName });
  }, [groupId, groupName, navigation]);

  const handleAddBill = useCallback(() => {
    navigation.navigate('AddBill', { groupId, groupName });
  }, [groupId, groupName, navigation]);

  const handleDeleteBill = useCallback(
    (bill: Bill) => {
      Alert.alert('حذف الإيصال', `هل تريد حذف "${bill.venueName ?? bill.title ?? 'هذا الإيصال'}"؟`, [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBill(bill.id).unwrap();
            } catch {
              Alert.alert('خطأ', 'تعذر حذف الإيصال');
            }
          },
        },
      ]);
    },
    [deleteBill],
  );

  const handleRemove = useCallback(
    (member: GroupMember) => {
      const name = member.user?.displayName ?? member.pendingPhone ?? 'هذا العضو';
      Alert.alert(
        'إزالة عضو',
        `هل تريد إزالة ${name} من المجموعة؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إزالة',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember({ groupId, memberId: member.id }).unwrap();
              } catch {
                Alert.alert('خطأ', 'تعذر إزالة العضو، حاول مرة أخرى لاحقاً');
              }
            },
          },
        ],
      );
    },
    [groupId, removeMember],
  );

  const renderMember = useCallback(
    ({ item }: { item: GroupMember }) => (
      <MemberRow
        member={item}
        isAdmin={isAdmin}
        isSelf={item.userId === me?.id}
        onRemove={() => handleRemove(item)}
      />
    ),
    [isAdmin, me?.id, handleRemove],
  );

  const isChatPending = myMembership?.status === 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

        {/* Tab bar */}
        <View style={styles.tabs}>
          {(['chat', 'bills', 'members'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'chat' ? '💬 الدردشة' : tab === 'bills' ? 'الفواتير' : 'الأعضاء'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Chat tab ─────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <View style={styles.flex}>
            {isChatPending ? (
              <View style={styles.centered}>
                <Text style={styles.pendingChatText}>
                  يجب قبول الدعوة أولاً للوصول إلى الدردشة.
                </Text>
              </View>
            ) : chatLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : chatMessages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatIcon}>💬</Text>
                <Text style={styles.emptyChatText}>لا توجد رسائل بعد، ابدأ المحادثة!</Text>
              </View>
            ) : (
              <FlatList
                ref={chatListRef}
                data={chatMessages}
                keyExtractor={(m) => m.id}
                renderItem={({ item, index }) => {
                  const isMine = item.senderId === me?.id;
                  const nextMsg = chatMessages[index + 1];
                  const showSender = !isMine && (!nextMsg || nextMsg.senderId !== item.senderId);
                  return (
                    <ChatBubble
                      msg={item}
                      isMine={isMine}
                      showSender={showSender}
                      onRetry={handleChatRetry}
                    />
                  );
                }}
                inverted
                contentContainerStyle={styles.chatList}
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                  loadingMore ? <ActivityIndicator color={Colors.primary} style={styles.loadMoreSpinner} /> : null
                }
              />
            )}

            {!isChatPending && (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={chatText}
                  onChangeText={setChatText}
                  placeholder="اكتب رسالة..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  maxLength={1000}
                  textAlign="right"
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !chatText.trim() && styles.sendBtnDisabled]}
                  onPress={handleChatSend}
                  disabled={!chatText.trim()}
                  activeOpacity={0.8}>
                  <Text style={styles.sendIcon}>▶</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Bills tab ────────────────────────────────────── */}
        {activeTab === 'bills' && (
          <View style={styles.flex}>
            <View style={styles.billActions}>
              <TouchableOpacity style={styles.billActionBtn} onPress={handleScanQR} activeOpacity={0.8}>
                <Text style={styles.billActionIcon}>📷</Text>
                <Text style={styles.billActionText}>مسح QR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.billActionBtn} onPress={handleScanOCR} activeOpacity={0.8}>
                <Text style={styles.billActionIcon}>🖨</Text>
                <Text style={styles.billActionText}>مسح إيصال</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billActionBtn, styles.billActionBtnPrimary]}
                onPress={handleAddBill}
                activeOpacity={0.8}>
                <Text style={styles.billActionIcon}>✏️</Text>
                <Text style={[styles.billActionText, styles.billActionTextPrimary]}>يدوي</Text>
              </TouchableOpacity>
            </View>

            {billsLoading ? (
              <ActivityIndicator color={Colors.primary} style={styles.loader} />
            ) : !bills?.length ? (
              <View style={styles.emptyBills}>
                <Text style={styles.emptyBillsIcon}>🧾</Text>
                <Text style={styles.emptyBillsTitle}>لا توجد إيصالات بعد</Text>
                <Text style={styles.emptyBillsSubtitle}>أضف أو امسح أول إيصال للمجموعة</Text>
              </View>
            ) : (
              <FlatList
                data={bills}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                  <BillCard
                    bill={item}
                    canDelete={item.paidByUserId === me?.id || isAdmin}
                    onDelete={() => handleDeleteBill(item)}
                  />
                )}
                contentContainerStyle={styles.list}
              />
            )}
          </View>
        )}

        {/* ── Members tab ──────────────────────────────────── */}
        {activeTab === 'members' && (
          <View style={styles.flex}>
            {isAdmin && (
              <Button
                title="+ دعوة أعضاء"
                onPress={() => navigation.navigate('InviteMembers', { groupId })}
                variant="outline"
                style={styles.inviteBtn}
              />
            )}
            {isLoading ? (
              <ActivityIndicator color={Colors.primary} style={styles.loader} />
            ) : (
              <FlatList
                data={members?.filter((m) => m.status !== 'removed') ?? []}
                keyExtractor={(m) => m.id}
                renderItem={renderMember}
                contentContainerStyle={styles.list}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(GroupDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  // Chat
  chatList: { padding: 12 },
  loadMoreSpinner: { paddingVertical: 16 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyChatIcon: { fontSize: 48 },
  emptyChatText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  pendingChatText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendIcon: { color: Colors.textOnPrimary, fontSize: 13 },

  // Chat bubble
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  bubbleRowMine: { flexDirection: 'row-reverse' },
  avatarCol: { width: 38, alignItems: 'center', justifyContent: 'flex-end', marginRight: 4 },
  avatarSpacer: { width: 32, height: 32 },
  bubbleCol: { flex: 1 },
  senderName: { fontSize: 10, fontWeight: '700', color: Colors.primary, marginBottom: 2, marginLeft: 4 },
  bubble: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 1,
  },
  bubbleFailed: { opacity: 0.7, borderWidth: 1, borderColor: Colors.danger + '55' },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 19 },
  bubbleTextMine: { color: Colors.textOnPrimary },
  bubbleTime: { fontSize: 9, color: Colors.textMuted, marginTop: 3, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeFailed: { color: Colors.danger },

  // Bills
  billActions: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 6 },
  billActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  billActionBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  billActionIcon: { fontSize: 14 },
  billActionText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  billActionTextPrimary: { color: Colors.textOnPrimary },

  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  billIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billIconText: { fontSize: 20 },
  billInfo: { flex: 1 },
  billTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  billMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  billRight: { alignItems: 'flex-end', gap: 2 },
  billAmount: { fontSize: 15, fontWeight: '700', color: Colors.text },
  billCurrency: { fontSize: 10, color: Colors.textMuted },
  billDelete: { fontSize: 15, marginTop: 4 },

  emptyBills: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyBillsIcon: { fontSize: 48 },
  emptyBillsTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptyBillsSubtitle: { fontSize: 13, color: Colors.textSecondary },

  // Members
  inviteBtn: { margin: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  loader: { marginTop: 40 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  memberPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  adminBadge: { backgroundColor: Colors.primaryLight + '33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  adminText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  pendingBadge: { backgroundColor: Colors.pending + '33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pendingText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  removeBtn: { padding: 8 },
  removeText: { fontSize: 13, color: Colors.danger, fontWeight: '500' },
});
