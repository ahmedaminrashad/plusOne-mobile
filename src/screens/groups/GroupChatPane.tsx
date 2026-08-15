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
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { ASSET_BASE_URL } from '../../config';
import { setActiveChatGroupId } from '../../services/activeChat';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useGetGroupMessagesQuery, useSendGroupMessageMutation, useUploadChatImageMutation } from '../../store/api/groupsApi';
import { ChatMessage } from '../../types/models';
import { AppStackParamList } from '../../types/navigation';
import { formatDate, formatCurrency } from '../../utils/format';
import { useKeyboardInsetHeight } from '../../services/keyboardInsets';
import { ReceiptIcon, ChatBubbleIcon, PaperclipIcon, SendIcon, WarningIcon } from '../../components/icons';

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
  | { kind: 'message'; message: ChatMessage }
  | { kind: 'separator'; key: string; label: string };

// Figma shows a rounded "Today" pill dividing message groups by calendar day.
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string, t: (key: string) => string) {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return t('chat.dateToday');
  if (diffDays === 1) return t('chat.dateYesterday');
  return formatDate(d, { day: 'numeric', month: 'short' });
}

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
  const typography = useTypography();

  if (item.kind === 'pending') {
    const { item: pending } = item;
    const timeStr = pending.failed ? t('chat.sendFailed') : t('chat.sendingEllipsis');
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowMine]}>
        <View style={styles.bubbleColMine}>
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
                <Text style={[typography.bodyMedium, styles.bubbleText, styles.bubbleTextMine]}>{pending.text}</Text>
              )}
              <View style={styles.bubbleTimeRow}>
                {pending.failed && <WarningIcon size={11} color={Colors.danger} strokeWidth={2} />}
                <Text style={[typography.labelSmall, styles.bubbleTime, styles.bubbleTimeMine, pending.failed && styles.bubbleTimeFailed]}>
                  {timeStr}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (item.kind !== 'message') return null; // separators are rendered directly by the parent list

  // Figma shows no avatar and no per-message timestamp beside chat bubbles — just a
  // muted sender label above the bubble (shared by both text and bill-receipt messages)
  // and, separately, a date pill between day groups (rendered by the parent list).
  const msg = item.message;

  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      <View style={[styles.bubbleCol, isMine && styles.bubbleColMine]}>
        {!isMine && showSender && (
          <Text style={[typography.bodySmall, styles.senderName]}>{msg.senderName}</Text>
        )}
        {msg.bill ? (
          <TouchableOpacity
            style={styles.receiptCard}
            activeOpacity={0.8}
            onPress={() => onOpenReceipt(msg.bill!.id)}>
            <View style={styles.receiptIcon}>
              <ReceiptIcon size={18} color={Colors.primary} />
            </View>
            <View style={styles.receiptInfo}>
              <Text style={[typography.labelLarge, styles.receiptTitle]} numberOfLines={1}>
                {t('chat.receiptAddedTitle', { title: msg.bill.title ?? t('chat.receiptDefaultTitle') })}
              </Text>
              <Text style={[typography.bodySmall, styles.receiptMeta]}>
                {msg.bill.itemCount > 0
                  ? t('chat.receiptItemCount', { count: msg.bill.itemCount })
                  : t('chat.receiptNoItemsYet')}
              </Text>
              <View style={styles.receiptCtaPill}>
                <Text style={[typography.labelSmall, styles.receiptCta]}>
                  {msg.bill.closedAt ? t('chat.receiptViewCta') : t('chat.receiptOpenCta')}
                </Text>
              </View>
            </View>
            <Text style={[typography.labelLarge, styles.receiptAmount]}>{formatCurrency(Number(msg.bill.amount), msg.bill.currency)}</Text>
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
              <Text style={[typography.bodyMedium, styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.text}</Text>
            )}
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
  const typography = useTypography();
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
    navigation.navigate('BillStatus', { groupId, groupName, billId });
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

  // Messages arrive newest-first (for the inverted list); a date-pill separator is
  // inserted right after the oldest message of each calendar day so it renders above
  // that day's block on screen (Figma: rounded "Today" pill between message groups).
  const messageItems: ChatListItem[] = [];
  (messages ?? []).forEach((message, idx) => {
    messageItems.push({ kind: 'message', message });
    const next = (messages ?? [])[idx + 1];
    if (!next || dayKey(next.createdAt) !== dayKey(message.createdAt)) {
      messageItems.push({ kind: 'separator', key: `sep-${message.id}`, label: dayLabel(message.createdAt, t) });
    }
  });

  const listData: ChatListItem[] = [
    ...pending.filter((item) => item.failed).map((item) => ({ kind: 'pending' as const, item })),
    ...messageItems,
  ];

  return (
    <View style={styles.flex}>
      {listData.length === 0 ? (
        <View style={styles.emptyChat}>
          <ChatBubbleIcon size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyChatText}>{t('chat.emptyText')}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item) => {
            if (item.kind === 'pending') return item.item.localId;
            if (item.kind === 'separator') return item.key;
            return item.message.id;
          }}
          renderItem={({ item, index }) => {
            if (item.kind === 'pending') {
              return (
                <MessageBubble item={item} isMine showSender={false} onRetry={handleRetry} onOpenReceipt={handleOpenReceipt} />
              );
            }
            if (item.kind === 'separator') {
              return (
                <View style={styles.dateSeparatorRow}>
                  <View style={styles.dateSeparatorPill}>
                    <Text style={[typography.labelMedium, styles.dateSeparatorText]}>{item.label}</Text>
                  </View>
                </View>
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={Colors.primary} style={styles.loadMoreSpinner} />
              : null
          }
        />
      )}

      <View
        style={[
          styles.inputRow,
          keyboardInset > 0 && { marginBottom: keyboardInset, paddingBottom: 4, paddingTop: 6 },
        ]}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handlePickImage}
          activeOpacity={0.8}>
          <PaperclipIcon size={18} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[typography.bodyMedium, styles.input]}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.messagePlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.8}>
          <SendIcon size={18} color={Colors.textOnPrimary} />
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

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  bubbleRowMine: { flexDirection: 'row-reverse' },
  bubbleCol: { flex: 1, alignItems: 'flex-start' },
  bubbleColMine: { alignItems: 'flex-end' },
  senderName: { color: Colors.textSecondary, marginBottom: 3, marginLeft: 4 },
  // Corner radii match Figma's asymmetric rectangleCornerRadii exactly: [18,18,18,6]
  // for received bubbles (tail bottom-left) and [18,18,6,18] for sent (tail bottom-right).
  bubble: {
    maxWidth: '80%',
    alignSelf: 'flex-start',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 6,
    shadowColor: Colors.primaryDark,
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
    borderRadius: Radius.xl,
    padding: 12,
    gap: 10,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  receiptIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptInfo: { flex: 1 },
  receiptTitle: { color: Colors.text },
  receiptMeta: { color: Colors.textSecondary, marginTop: 2 },
  receiptCtaPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.tint,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  receiptCta: { color: Colors.primary },
  receiptAmount: { color: Colors.text, marginLeft: 6 },
  bubbleImageWrap: { padding: 4 },
  bubbleImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  bubbleText: { color: Colors.text },
  bubbleTextMine: { color: Colors.textOnPrimary },
  bubbleTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 },
  bubbleTime: { color: Colors.textMuted, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeFailed: { color: Colors.danger },

  // Date separator — Figma: rounded tint pill ("Today") between message day-groups.
  dateSeparatorRow: { alignItems: 'center', marginVertical: 8 },
  dateSeparatorPill: {
    backgroundColor: Colors.tint,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  dateSeparatorText: { color: Colors.primary },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  // No Figma reference for the image-attach entry point (not shown in the mockup),
  // but it's real, working functionality (chat image upload) — kept, restyled to
  // fit the app's tint-chip convention instead of the old flat-gray circle.
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyChatText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
