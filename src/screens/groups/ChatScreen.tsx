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

type Props = AppScreenProps<'Chat'>;

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string | null;
  text: string;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
}

function MessageBubble({ msg, isMine, showSender }: { msg: Message; isMine: boolean; showSender: boolean }) {
  const time = msg.createdAt
    ? new Date(msg.createdAt.toMillis()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : '';

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
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.text}</Text>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{time}</Text>
        </View>
      </View>
    </View>
  );
}

function ChatScreen({ route }: Props) {
  const { groupId } = route.params;
  const { data: me } = useGetMeQuery();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = firestore()
      .collection('groupChats')
      .doc(groupId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot(
        (snap) => {
          const msgs: Message[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }));
          setMessages(msgs);
          setLoading(false);
        },
        () => setLoading(false),
      );
    return unsub;
  }, [groupId]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !me || sending) return;
    setSending(true);
    setText('');
    try {
      await firestore()
        .collection('groupChats')
        .doc(groupId)
        .collection('messages')
        .add({
          senderId: me.id,
          senderName: me.displayName ?? 'مستخدم',
          senderPhoto: me.photoUrl ?? null,
          text: trimmed,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
    } finally {
      setSending(false);
    }
  }, [text, me, groupId, sending]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
              // messages are inverted (newest first), so next item is the one above in the list
              const nextMsg = messages[index + 1];
              const showSender = !isMine && (!nextMsg || nextMsg.senderId !== item.senderId);
              return <MessageBubble msg={item} isMine={isMine} showSender={showSender} />;
            }}
            inverted
            contentContainerStyle={styles.messagesList}
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
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}>
            {sending ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.sendIcon}>▶</Text>
            )}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: 12 },
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
  bubbleText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  bubbleTextMine: { color: Colors.textOnPrimary },
  bubbleTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
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
