import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { ASSET_BASE_URL } from '../../config';
import { setActiveChatGroupId } from '../../services/activeChat';
import Avatar from '../../components/common/Avatar';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useGetGroupMessagesQuery, useSendGroupMessageMutation, useUploadChatImageMutation } from '../../store/api/groupsApi';
import { ChatMessage } from '../../types/models';
import { AppStackParamList } from '../../types/navigation';
import { formatRelativeTime, formatCurrency } from '../../utils/format';
import { useKeyboardInsetHeight } from '../../services/keyboardInsets';

// The single implementation of a group's chat (message list + composer), used both
// by the standalone Chat screen (reached from the share-to-group flow) and embedded
// as a tab inside GroupDetailScreen. Chat used to live in Firestore; that required a
// Cloud Firestore database actually provisioned for the Firebase project (a separate
// manual setup step from just having a project), which this project's didn't have —
// so every message got stuck "pending" forever with no code fix possible. Chat now
// lives in the same MySQL backend as everything else, polled on an interval. Firebase
// is still used, just for FCM push notifications (see notifications.service.ts).

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 3000;

// A message send in flight: shown locally until the POST resolves. Unlike the old
// Firestore version, a REST send is a real round trip with no local-cache shortcut,
// so both text and image sends need this (previously only images did).
interface PendingMessage {
  localId: string;
  text: string;
  imageUri?: string; // local file uri, shown as a preview while uploading/sending
  failed?: boolean;
}

type ChatListItem =
  | { kind: 'pending'; item: PendingMessage }
  | { kind: 'message'; message: ChatMessage };

function MessageBubble({
  item,
  isMine,
  showSender,
  onRetry,
  onOpenReceipt,
}: {
  item: ChatListItem;
  isMine: boolean;
  showSender: boolean;
  onRetry: (localId: string) => void;
  onOpenReceipt: (billId: string) => void;
}) {
  const { t } = useTranslation('groups');

  if (item.kind === 'pending') {
    const { item: pending } = item;
    const timeStr = pending.failed ? t('chat.sendFailed') : t('chat.sendingEllipsis');
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowMine]}>
        <View style={styles.bubbleCol}>
          <TouchableOpacity
            activeOpacity={pending.failed ? 0.6 : 1}
            onPress={pending.failed ? () => onRetry(pending.localId) : undefined}>
            <View style={[
              styles.bubble,
              pending.imageUri && styles.bubbleImageWrap,
              styles.bubbleMine,
              pending.failed && styles.bubbleFailed,
            ]}>
              {pending.imageUri && (
                <Image source={{ uri: pending.imageUri }} style={styles.bubbleImage} resizeMode="cover" />
              )}
              {!!pending.text && (
                <Text style={[styles.bubbleText, styles.bubbleTextMine]}>{pending.text}</Text>
              )}
              <Text style={[styles.bubbleTime, styles.bubbleTimeMine, pending.failed && styles.bubbleTimeFailed]}>
                {pending.failed ? '⚠ ' : ''}{timeStr}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const msg = item.message;
  const timeStr = formatRelativeTime(new Date(msg.createdAt));

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
        {msg.bill ? (
          <TouchableOpacity
            style={styles.receiptCard}
            activeOpacity={0.8}
            onPress={() => onOpenReceipt(msg.bill!.id)}>
            <View style={styles.receiptIcon}>
              <Text style={styles.receiptIconText}>🧾</Text>
            </View>
            <View style={styles.receiptInfo}>
              <Text style={styles.receiptTitle} numberOfLines={1}>
                {msg.bill.title ?? t('chat.receiptDefaultTitle')}
              </Text>
              <Text style={styles.receiptMeta}>
                {msg.bill.itemCount > 0
                  ? t('chat.receiptItemCount', { count: msg.bill.itemCount })
                  : t('chat.receiptNoItemsYet')}
              </Text>
              <Text style={styles.receiptCta}>{t('chat.receiptOpenCta')}</Text>
            </View>
            <Text style={styles.receiptAmount}>{formatCurrency(Number(msg.bill.amount), msg.bill.currency)}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[
            styles.bubble,
            msg.imageUrl && styles.bubbleImageWrap,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
          ]}>
            {msg.imageUrl && (
              <Image source={{ uri: msg.imageUrl }} style={styles.bubbleImage} resizeMode="cover" />
            )}
            {!!msg.text && (
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.text}</Text>
            )}
            <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{timeStr}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface GroupChatPaneProps {
  groupId: string;
  groupName: string;
  navigation: NativeStackNavigationProp<AppStackParamList>;
  // A photo shared into PlusOne from another app, handed off once the user picks
  // this group — sent immediately once `me` is available. Only the standalone Chat
  // screen (reached via the share flow) passes this; the embedded tab doesn't.
  sharedImageUri?: string;
  onSharedImageConsumed?: () => void;
}

function GroupChatPane({ groupId, groupName, navigation, sharedImageUri, onSharedImageConsumed }: GroupChatPaneProps) {
  const { t } = useTranslation('groups');
  const { data: me } = useGetMeQuery();
  const [sendGroupMessage] = useSendGroupMessageMutation();
  const [uploadChatImage] = useUploadChatImageMutation();

  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [text, setText] = useState('');
  // Grows on loadMore rather than a separate cursor/older-messages array — see the
  // Firestore-era version's history for why a two-array approach can drop messages
  // silently. A single growing-limit query has no such gap.
  const [pageLimit, setPageLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<FlatList>(null);
  const keyboardInset = useKeyboardInsetHeight();

  useFocusEffect(
    useCallback(() => {
      setActiveChatGroupId(groupId);
      return () => setActiveChatGroupId(null);
    }, [groupId]),
  );

  const {
    data: messages,
    isLoading,
    isFetching,
    isError,
  } = useGetGroupMessagesQuery(
    { groupId, limit: pageLimit },
    { pollingInterval: POLL_INTERVAL_MS },
  );

  useEffect(() => {
    if (!isFetching) setLoadingMore(false);
  }, [isFetching]);

  const hasMore = (messages?.length ?? 0) >= pageLimit;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPageLimit((prev) => prev + PAGE_SIZE);
  }, [loadingMore, hasMore]);

  const doSend = useCallback(async (trimmed: string) => {
    if (!me) return;
    const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPending((prev) => [{ localId, text: trimmed }, ...prev]);
    try {
      await sendGroupMessage({ groupId, text: trimmed }).unwrap();
      setPending((prev) => prev.filter((p) => p.localId !== localId));
    } catch {
      setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, failed: true } : p)));
    }
  }, [me, groupId, sendGroupMessage]);

  const doSendImage = useCallback(async (uri: string) => {
    if (!me) return;
    const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPending((prev) => [{ localId, text: '', imageUri: uri }, ...prev]);
    try {
      const { url } = await uploadChatImage({ groupId, uri }).unwrap();
      await sendGroupMessage({ groupId, imageUrl: `${ASSET_BASE_URL}${url}` }).unwrap();
      setPending((prev) => prev.filter((p) => p.localId !== localId));
    } catch {
      setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, failed: true } : p)));
    }
  }, [me, groupId, uploadChatImage, sendGroupMessage]);

  const sharedImageSentRef = useRef(false);
  useEffect(() => {
    if (!sharedImageUri || sharedImageSentRef.current || !me) return;
    sharedImageSentRef.current = true;
    onSharedImageConsumed?.();
    doSendImage(sharedImageUri);
  }, [sharedImageUri, me, doSendImage, onSharedImageConsumed]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    doSend(trimmed);
  }, [text, doSend]);

  const handlePickImage = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      if (res.assets?.[0]?.fileSize && res.assets[0].fileSize > 10 * 1024 * 1024) {
        Alert.alert(t('common:error'), t('chat.imageTooLarge'));
        return;
      }
      doSendImage(uri);
    });
  }, [doSendImage, t]);

  const handleRetry = useCallback((localId: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.localId === localId);
      if (item) {
        if (item.imageUri) doSendImage(item.imageUri);
        else doSend(item.text);
      }
      return prev.filter((p) => p.localId !== localId);
    });
  }, [doSend, doSendImage]);

  const handleOpenReceipt = useCallback((billId: string) => {
    navigation.navigate('ViewReceipt', { groupId, groupName, billId });
  }, [navigation, groupId, groupName]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('chat.loadError')}</Text>
      </View>
    );
  }

  const listData: ChatListItem[] = [
    ...pending.map((item) => ({ kind: 'pending' as const, item })),
    ...(messages ?? []).map((message) => ({ kind: 'message' as const, message })),
  ];

  return (
    <View style={[styles.flex, { paddingBottom: keyboardInset }]}>
      {listData.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyChatIcon}>💬</Text>
          <Text style={styles.emptyChatText}>{t('chat.emptyText')}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item) => (item.kind === 'pending' ? item.item.localId : item.message.id)}
          renderItem={({ item, index }) => {
            if (item.kind === 'pending') {
              return (
                <MessageBubble item={item} isMine showSender={false} onRetry={handleRetry} onOpenReceipt={handleOpenReceipt} />
              );
            }
            const msg = item.message;
            const isMine = msg.senderId === me?.id;
            const nextItem = listData[index + 1];
            const nextMsg = nextItem?.kind === 'message' ? nextItem.message : undefined;
            const showSender = !isMine && (!nextMsg || nextMsg.senderId !== msg.senderId);
            return (
              <MessageBubble
                item={item}
                isMine={isMine}
                showSender={showSender}
                onRetry={handleRetry}
                onOpenReceipt={handleOpenReceipt}
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
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handlePickImage}
          activeOpacity={0.8}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.messagePlaceholder')}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.8}>
          <Text style={styles.sendIcon}>▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default GroupChatPane;

const styles = StyleSheet.create({
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
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
    gap: 10,
  },
  receiptIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptIconText: { fontSize: 18 },
  receiptInfo: { flex: 1 },
  receiptTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  receiptMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  receiptCta: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 3 },
  receiptAmount: { fontSize: 14, fontWeight: '700', color: Colors.text, marginLeft: 6 },
  bubbleImageWrap: { padding: 4 },
  bubbleImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
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
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIcon: { fontSize: 20, color: Colors.text },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyChatIcon: { fontSize: 52 },
  emptyChatText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
