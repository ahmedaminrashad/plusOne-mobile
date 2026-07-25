import React, { useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, ViewStyle, TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useGetBillDetailQuery, useCloseBillMutation } from '../../store/api/billsApi';
import {
  useConfirmShareMutation,
  useRemindAllPendingMutation,
} from '../../store/api/sharesApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { Share } from '../../types/models';
import { formatCurrency, formatTime, resolveAssetUrl } from '../../utils/format';

type Props = AppScreenProps<'BillStatus'>;

function ShareRow({ share, payerName }: { share: Share; payerName: string }) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const name = share.owner?.displayName ?? share.ownerPendingPhone ?? t('viewReceipt.defaultUserName');
  const isNonApp = !share.ownerUserId;

  let subtitle = '';
  let badgeStyle: ViewStyle = styles.badgePending;
  let badgeTextStyle: TextStyle = styles.badgeTextPending;
  let badgeLabel = t('billStatus.pendingBadge');

  if (share.status === 'settled') {
    subtitle = share.method === 'cash'
      ? t('billStatus.cashConfirmedBy', { name: payerName })
      : t('billStatus.instaPayMethod', { time: formatTime(share.updatedAt) });
    badgeStyle = styles.badgePaid;
    badgeTextStyle = styles.badgeTextPaid;
    badgeLabel = t('billStatus.paidBadge');
  } else if (share.status === 'initiated') {
    subtitle = isNonApp ? t('billStatus.payLinkSentBySms') : '';
    badgeStyle = isNonApp ? styles.badgeLinkOpened : styles.badgePending;
    badgeTextStyle = isNonApp ? styles.badgeTextLinkOpened : styles.badgeTextPending;
    badgeLabel = isNonApp ? t('billStatus.linkOpenedBadge') : t('billStatus.pendingBadge');
  } else if (isNonApp) {
    subtitle = t('billStatus.payLinkSentBySms');
  }

  return (
    <View style={styles.shareRow}>
      <Avatar uri={resolveAssetUrl(share.owner?.photoUrl)} name={name} size={40} />
      <View style={styles.shareInfo}>
        <Text style={[typography.labelLarge, styles.shareName]}>{name}</Text>
        {!!subtitle && <Text style={[typography.bodySmall, styles.shareSubtitle]}>{subtitle}</Text>}
      </View>
      <View style={[styles.badge, badgeStyle]}>
        <Text style={[typography.labelSmall, badgeTextStyle]}>{badgeLabel}</Text>
      </View>
    </View>
  );
}

function BillStatusScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const { groupId, groupName, billId } = route.params;
  const { data: bill, isLoading } = useGetBillDetailQuery(billId);
  const { data: me } = useGetMeQuery();
  const [confirmShare] = useConfirmShareMutation();
  const [remindAll, { isLoading: isReminding }] = useRemindAllPendingMutation();
  const [closeBill, { isLoading: isClosing }] = useCloseBillMutation();

  const handleEditItems = useCallback(() => {
    navigation.navigate('EditBillItems', { groupId, groupName, billId });
  }, [navigation, groupId, groupName, billId]);

  const handleCloseSplit = useCallback(() => {
    Alert.alert(
      t('viewReceipt.closeSplitConfirmTitle'),
      t('viewReceipt.closeSplitConfirmMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('viewReceipt.closeSplitButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await closeBill(billId).unwrap();
            } catch {
              Alert.alert(t('common:error'), t('viewReceipt.closeSplitFailed'));
            }
          },
        },
      ],
    );
  }, [closeBill, billId, t]);

  const isPayer = !!me && !!bill && bill.paidByUserId === me.id;
  const payerName = bill?.paidBy?.displayName ?? t('viewReceipt.defaultUserName');
  const myShare = bill?.shares.find((s) => s.ownerUserId === me?.id);
  const myShareOutstanding = !isPayer && !!myShare && myShare.status !== 'settled';

  const handlePayMyShare = useCallback(() => {
    navigation.navigate('PayShare', { groupId, groupName, billId });
  }, [navigation, groupId, groupName, billId]);

  const activeShares = useMemo(
    () => (bill?.shares ?? []).filter((s) => s.status !== 'cancelled'),
    [bill?.shares],
  );
  const paidCount = activeShares.filter((s) => s.status === 'settled').length;
  const pendingShares = activeShares.filter((s) => s.status === 'pending' || s.status === 'failed');
  const initiatedShares = activeShares.filter((s) => s.status === 'initiated');
  const collected = activeShares.filter((s) => s.status === 'settled').reduce((sum, s) => sum + s.amountPiastres, 0);
  const owed = activeShares.reduce((sum, s) => sum + s.amountPiastres, 0);
  const progress = owed > 0 ? collected / owed : 0;

  const handleRemind = useCallback(async () => {
    try {
      await remindAll(billId).unwrap();
    } catch {
      // rate-limited/no-op reminders are silently ignored, matching the per-share remind UX
    }
  }, [remindAll, billId]);

  const handleMarkReceived = useCallback(async () => {
    try {
      await Promise.all(initiatedShares.map((s) => confirmShare(s.id).unwrap()));
    } catch {
      Alert.alert(t('common:error'), t('billStatus.confirmFailed'));
    }
  }, [initiatedShares, confirmShare, t]);

  if (isLoading || !bill) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const displayName = bill.venueName ?? bill.title ?? t('viewReceipt.defaultBillName');
  const date = new Date(bill.createdAt).toLocaleString();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.headingLarge, styles.back]}>‹</Text>
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]} numberOfLines={1}>{displayName}</Text>
        <View style={styles.paidCountBadge}>
          <Text style={[typography.labelMedium, styles.paidCountText]}>
            {t('billStatus.paidCount', { paid: paidCount, total: activeShares.length })}
          </Text>
        </View>
      </View>

      {bill.isEditable && isPayer && (
        <View style={styles.actionsRow}>
          <Button
            title={bill.lineItems && bill.lineItems.length > 0 ? t('viewReceipt.editItemsButton') : t('viewReceipt.addItemsButton')}
            onPress={handleEditItems}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title={t('viewReceipt.closeSplitButton')}
            onPress={handleCloseSplit}
            loading={isClosing}
            variant="outline"
            style={styles.actionButton}
          />
        </View>
      )}

      <FlatList
        data={activeShares}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <ShareRow share={item} payerName={payerName} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.totalCard}>
            <Text style={[typography.labelMedium, styles.totalLabel]}>{t('billStatus.totalBillLabel')}</Text>
            <Text style={[typography.amountLarge, styles.totalAmount]}>{formatCurrency(Number(bill.amount), bill.currency)}</Text>
            <Text style={[typography.bodySmall, styles.paidBySubtitle]}>
              {t('viewReceipt.paidByAndDate', { payerName, date })}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
            </View>
            <Text style={[typography.bodySmall, styles.progressCaption]}>
              {t('billStatus.collectedOf', {
                collected: formatCurrency(collected / 100, bill.currency),
                owed: formatCurrency(owed / 100, bill.currency),
                payer: payerName,
              })}
            </Text>
          </View>
        }
      />

      {myShareOutstanding && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.markReceivedBtn} onPress={handlePayMyShare}>
            <Text style={[typography.labelLarge, styles.markReceivedText]}>{t('viewReceipt.payButton')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPayer && (pendingShares.length > 0 || initiatedShares.length > 0) && (
        <View style={styles.bottomBar}>
          {pendingShares.length > 0 && (
            <TouchableOpacity style={styles.remindBtn} onPress={handleRemind} disabled={isReminding}>
              <Text style={[typography.labelLarge, styles.remindBtnText]}>
                {t('billStatus.remindButton', { count: pendingShares.length })}
              </Text>
            </TouchableOpacity>
          )}
          {initiatedShares.length > 0 && (
            <TouchableOpacity style={styles.markReceivedBtn} onPress={handleMarkReceived}>
              <Text style={[typography.labelLarge, styles.markReceivedText]}>{t('billStatus.markReceivedButton')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(BillStatusScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { color: Colors.accent },
  title: { flex: 1, color: Colors.text },
  paidCountBadge: { backgroundColor: Colors.warningTint, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  paidCountText: { color: Colors.accent },

  list: { paddingHorizontal: 16, paddingBottom: 24 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  actionButton: { flex: 1, height: 44 },

  totalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { color: Colors.textMuted, letterSpacing: 0.5 },
  totalAmount: { color: Colors.text, marginTop: 6 },
  paidBySubtitle: { color: Colors.textSecondary, marginTop: 6 },
  progressTrack: { height: 6, backgroundColor: Colors.borderLight, borderRadius: Radius.pill, width: '100%', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: Radius.pill },
  progressCaption: { color: Colors.textMuted, marginTop: 8 },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 8,
  },
  shareInfo: { flex: 1 },
  shareName: { color: Colors.text },
  shareSubtitle: { color: Colors.textMuted, marginTop: 2 },

  badge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgePaid: { backgroundColor: Colors.successTint },
  badgeTextPaid: { color: Colors.secondaryDark },
  badgePending: { backgroundColor: Colors.warningTint },
  badgeTextPending: { color: Colors.accent },
  badgeLinkOpened: { backgroundColor: Colors.warningTint },
  badgeTextLinkOpened: { color: Colors.accent },

  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  remindBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  remindBtnText: { color: Colors.primary },
  markReceivedBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  markReceivedText: { color: Colors.textOnPrimary },
});
