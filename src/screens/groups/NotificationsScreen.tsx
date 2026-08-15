import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import {
  useGetMyInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../../store/api/groupsApi';
import { useGetMySharesQuery, useConfirmShareMutation, MyShare } from '../../store/api/sharesApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { GroupMember } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import { BellIcon, MailIcon, CheckIcon } from '../../components/icons';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { formatCurrency, resolveAssetUrl } from '../../utils/format';

type Props = AppScreenProps<'Notifications'>;

type FeedItem =
  | { kind: 'approval'; share: MyShare }
  | { kind: 'toPay'; share: MyShare }
  | { kind: 'invite'; invitation: GroupMember };

function NotificationsScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: me } = useGetMeQuery();
  const {
    data: shares,
    isLoading: loadingShares,
    isFetching: fetchingShares,
    refetch: refetchShares,
  } = useGetMySharesQuery(undefined, { pollingInterval: 15_000 });
  const {
    data: invitations,
    isLoading: loadingInvites,
    isFetching: fetchingInvites,
    refetch: refetchInvites,
  } = useGetMyInvitationsQuery(undefined, { pollingInterval: 15_000 });

  const [confirmShare, { isLoading: confirming }] = useConfirmShareMutation();
  const [acceptInvite, { isLoading: accepting }] = useAcceptInvitationMutation();
  const [declineInvite, { isLoading: declining }] = useDeclineInvitationMutation();

  const approvals = useMemo(
    () =>
      (shares ?? []).filter(
        (s) => s.status === 'initiated' && s.initiatorUserId === me?.id,
      ),
    [shares, me?.id],
  );

  const toPay = useMemo(
    () =>
      (shares ?? []).filter(
        (s) =>
          s.ownerUserId === me?.id &&
          s.initiatorUserId !== me?.id &&
          (s.status === 'pending' || s.status === 'failed'),
      ),
    [shares, me?.id],
  );

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...approvals.map((share) => ({ kind: 'approval' as const, share })),
      ...toPay.map((share) => ({ kind: 'toPay' as const, share })),
      ...(invitations ?? []).map((invitation) => ({ kind: 'invite' as const, invitation })),
    ];
    return items;
  }, [approvals, toPay, invitations]);

  const refreshing = fetchingShares || fetchingInvites;
  const loading = loadingShares || loadingInvites;

  const handleRefresh = useCallback(() => {
    refetchShares();
    refetchInvites();
  }, [refetchShares, refetchInvites]);

  const handleConfirm = useCallback(
    async (shareId: string) => {
      try {
        await confirmShare(shareId).unwrap();
      } catch {
        Alert.alert(t('common:error'), t('notifications.confirmFailed', { defaultValue: "Couldn't confirm payment" }));
      }
    },
    [confirmShare, t],
  );

  const handleAccept = useCallback(
    async (membershipId: string) => {
      await acceptInvite(membershipId);
    },
    [acceptInvite],
  );

  const handleDecline = useCallback(
    async (membershipId: string) => {
      await declineInvite(membershipId);
    },
    [declineInvite],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      if (item.kind === 'approval') {
        const { share } = item;
        const payerName =
          share.owner?.displayName ?? share.ownerPendingPhone ?? t('groupDetail.defaultUserName');
        const amount = formatCurrency(share.amountPiastres / 100, share.currency);
        return (
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.successTint }]}>
              <CheckIcon size={18} color={Colors.secondaryDark} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[typography.labelLarge, styles.cardTitle]} numberOfLines={2}>
                {t('notifications.approvalTitle', {
                  name: payerName,
                  amount,
                  defaultValue: `${payerName} paid ${amount}`,
                })}
              </Text>
              <Text style={[typography.bodySmall, styles.cardSub]} numberOfLines={1}>
                {share.group?.name ?? share.bill?.title ?? t('notifications.approvalSubtitle', { defaultValue: 'Confirm you received this payment' })}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.viewBtn]}
                  onPress={() =>
                    navigation.navigate('BillStatus', {
                      groupId: share.groupId,
                      groupName: share.group?.name ?? '',
                      billId: share.billId,
                    })
                  }
                  activeOpacity={0.7}>
                  <Text style={styles.viewBtnText}>{t('notifications.viewBill', { defaultValue: 'View' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={() => handleConfirm(share.id)}
                  disabled={confirming}
                  activeOpacity={0.7}>
                  {confirming ? (
                    <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.confirmBtnText}>
                      {t('notifications.confirmPayment', { defaultValue: 'Approve' })}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }

      if (item.kind === 'toPay') {
        const { share } = item;
        const amount = formatCurrency(share.amountPiastres / 100, share.currency);
        const billTitle = share.bill?.venueName ?? share.bill?.title ?? t('groupDetail.defaultBillName');
        return (
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.warningTint }]}>
              <BellIcon size={18} color={Colors.warningDark} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[typography.labelLarge, styles.cardTitle]} numberOfLines={2}>
                {t('notifications.toPayTitle', { amount, title: billTitle })}
              </Text>
              <Text style={[typography.bodySmall, styles.cardSub]} numberOfLines={1}>
                {share.group?.name ?? t('notifications.toPaySubtitle')}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={() =>
                    navigation.navigate('PayShare', {
                      groupId: share.groupId,
                      groupName: share.group?.name ?? '',
                      billId: share.billId,
                    })
                  }
                  activeOpacity={0.7}>
                  <Text style={styles.confirmBtnText}>{t('notifications.payNow')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }

      const invitation = item.invitation;
      const group = invitation.group;
      return (
        <View style={styles.card}>
          <Avatar uri={resolveAssetUrl(group?.avatarUrl)} name={group?.name} size={44} />
          <View style={styles.cardBody}>
            <Text style={[typography.labelLarge, styles.cardTitle]} numberOfLines={1}>
              {group?.name ?? '…'}
            </Text>
            <Text style={[typography.bodySmall, styles.cardSub]}>{t('invitations.invitedToJoin')}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleDecline(invitation.id)}
                disabled={declining || accepting}
                activeOpacity={0.7}>
                <Text style={styles.declineBtnText}>{t('invitations.decline')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => handleAccept(invitation.id)}
                disabled={declining || accepting}
                activeOpacity={0.7}>
                {accepting ? (
                  <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                ) : (
                  <Text style={styles.confirmBtnText}>{t('invitations.accept')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    },
    [typography, t, navigation, handleConfirm, handleAccept, handleDecline, confirming, accepting, declining],
  );

  return (
    <SafeScreen style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <Text style={[typography.headingLarge, styles.headerTitle]}>
          {t('notifications.title', { defaultValue: 'Notifications' })}
        </Text>
        <Text style={[typography.bodyMedium, styles.headerSub]}>
          {t('notifications.subtitle')}
        </Text>
      </View>

      {loading && feed.length === 0 ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) =>
            item.kind === 'approval'
              ? `a-${item.share.id}`
              : item.kind === 'toPay'
                ? `p-${item.share.id}`
                : `i-${item.invitation.id}`
          }
          renderItem={renderItem}
          contentContainerStyle={feed.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.secondary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <BellIcon size={40} color={Colors.textMuted} />
              </View>
              <Text style={[typography.headingMedium, styles.emptyTitle]}>
                {t('notifications.emptyTitle', { defaultValue: 'All caught up' })}
              </Text>
              <Text style={[typography.bodyMedium, styles.emptySubtitle]}>
                {t('notifications.emptySubtitle')}
              </Text>
              <TouchableOpacity
                style={styles.secondaryLink}
                onPress={() => navigation.navigate('Invitations')}>
                <MailIcon size={16} color={Colors.primary} />
                <Text style={[typography.labelMedium, styles.secondaryLinkText]}>
                  {t('notifications.viewInvitations', { defaultValue: 'Group invitations' })}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeScreen>
  );
}

export default memo(NotificationsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { color: Colors.text },
  headerSub: { color: Colors.textSecondary, marginTop: 4 },
  loader: { marginTop: 40 },
  list: { padding: 16, paddingBottom: 40 },
  listEmpty: { flexGrow: 1, padding: 16 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { color: Colors.text },
  cardSub: { color: Colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 84,
    alignItems: 'center',
  },
  viewBtn: { backgroundColor: Colors.neutral100, borderWidth: 1, borderColor: Colors.border },
  viewBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  confirmBtn: { backgroundColor: Colors.primary },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  declineBtn: { backgroundColor: Colors.dangerTint },
  declineBtnText: { color: Colors.danger, fontWeight: '600', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { marginBottom: 8 },
  emptyTitle: { color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },
  secondaryLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  secondaryLinkText: { color: Colors.primary },
});
