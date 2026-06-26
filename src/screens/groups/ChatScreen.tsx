import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useSendChatNotificationMutation } from '../../store/api/groupsApi';

type Props = AppScreenProps<'Chat'>;

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
  _failed?: boolean;
  _pending?: boolean;
}

const PAGE_SIZE = 30;

function formatTimestamp(ts: FirebaseFirestoreTypes.Timestamp | null): string {
  if (!ts) return '';
  const date = ts.toDate();
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `منذ ${diffMin} د`;
    const diffHr = Math.floor(diffMin / 60);
    return `منذ ${diffHr} س`;
  }

  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) +
    ' ' +
    date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({
  msg,
  isMine,
  showSender,
  onRetry,
}: {
  msg: Message;
  isMine: boolean;
  showSender: boolean;
  onRetry?: (msg: Message) => void;
}) {
  const timeStr = msg._pending ? 'إرسال...' : msg._failed ? 'فشل الإرسال' : formatTimestamp(msg.createdAt);

  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      {!isMine && (
        <View style={styles.avatarCol}>
          {showSender ? (
            <Avatar uri={msg.senderPhoto} name={msg.senderName} size={34} />
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
          onPress={msg._failed && onRetry ? () => onRetry(msg) : undefined}>
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

function ChatScreen({ route }: Props) {
  const { groupId } = route.params;
  const { data: me } = useGetMeQuery();
  const [sendChatNotification] = useSendChatNotificationMutation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const lastDocRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const listRef = useRef<FlatList>(null);

  const messagesRef = firestore()
    .collection('groupChats')
    .doc(groupId)
    .collection('messages');

  useEffect(() => {
    const unsub = messagesRef
      .orderBy('createdAt', 'desc')
      .limit(PAGE_SIZE)
      .onSnapshot(
        (snap) => {
          const msgs: Message[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Message, 'id'>),
          }));
          setMessages((prev) => {
            // Merge: replace real-version of any pending/failed msg, keep others
            const realIds = new Set(snap.docs.map((d) => d.id));
            const pending = prev.filter((m) => (m._pending || m._failed) && !realIds.has(m.id));
            return [...pending, ...msgs];
          });
          if (snap.docs.length > 0) {
            lastDocRef.current = snap.docs[snap.docs.length - 1];
          }
          setHasMore(snap.docs.length >= PAGE_SIZE);
          setLoading(false);
          setLoadError(false);
        },
        () => {
          setLoading(false);
          setLoadError(true);
        },
      );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const snap = await messagesRef
        .orderBy('createdAt', 'desc')
        .startAfter(lastDocRef.current)
        .limit(PAGE_SIZE)
        .get();
      if (snap.docs.length === 0) {
        setHasMore(false);
        return;
      }
      lastDocRef.current = snap.docs[snap.docs.length - 1];
      const older: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, 'id'>),
      }));
      setMessages((prev) => [...prev, ...older]);
      setHasMore(snap.docs.length >= PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, groupId]);

  const doSend = useCallback(async (trimmed: string) => {
    if (!me) return;
    const tempId = `pending-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: me.id,
      senderName: me.displayName ?? 'مستخدم',
      senderPhoto: me.photoUrl ?? null,
      text: trimmed,
      createdAt: null,
      _pending: true,
    };
    setMessages((prev) => [optimistic, ...prev]);

    try {
      await messagesRef.add({
        senderId: me.id,
        senderName: me.displayName ?? 'مستخدم',
        senderPhoto: me.photoUrl ?? null,
        text: trimmed,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      // Remove optimistic after real message arrives via listener
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      // Fire-and-forget push notification
      const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed;
      sendChatNotification({
        groupId,
        senderName: me.displayName ?? 'مستخدم',
        messagePreview: preview,
      }).catch(() => {});
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _pending: false, _failed: true } : m)),
      );
    }
  }, [me, groupId, sendChatNotification]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    doSend(trimmed);
  }, [text, doSend]);

  const handleRetry = useCallback((msg: Message) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    doSend(msg.text);
  }, [doSend]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>تعذر تحميل الرسائل، يرجى المحاولة لاحقاً.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatText}>لا توجد رسائل بعد، ابدأ المحادثة!</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item, index }) => {
              const isMine = item.senderId === me?.id;
              const nextMsg = messages[index + 1];
              const showSender = !isMine && (!nextMsg || nextMsg.senderId !== item.senderId);
              return (
                <MessageBubble
                  msg={item}
                  isMine={isMine}
                  showSender={showSender}
                  onRetry={handleRetry}
                />
              );
            }}
            inverted
            contentContainerStyle={styles.messagesList}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore
                ? <ActivityIndicator color={Colors.primary} style={styles.loadMoreSpinner} />
                : null
            }
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="اكتب رسالة..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={1000}
            textAlign="right"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.8}>
            <Text style={styles.sendIcon}>▶</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(ChatScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  messagesList: { padding: 12 },
  loadMoreSpinner: { paddingVertical: 16 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  bubbleRowMine: { flexDirection: 'row-reverse' },
  avatarCol: { width: 40, alignItems: 'center', justifyContent: 'flex-end', marginRight: 6 },
  avatarSpacer: { width: 34, height: 34 },
  bubbleCol: { flex: 1 },
  senderName: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginBottom: 3, marginLeft: 4 },
  bubble: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleFailed: { opacity: 0.7, borderWidth: 1, borderColor: Colors.danger + '60' },
  bubbleText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  bubbleTextMine: { color: Colors.textOnPrimary },
  bubbleTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeFailed: { color: Colors.danger },

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
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendIcon: { color: Colors.textOnPrimary, fontSize: 14 },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyChatIcon: { fontSize: 52 },
  emptyChatText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
