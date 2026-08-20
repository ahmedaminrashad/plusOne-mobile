import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Avatar from '../../components/common/Avatar';
import { ChevronLeftIcon, CheckIcon } from '../../components/icons';
import { useGetMySharesQuery, useSendShareReminderMutation } from '../../store/api/sharesApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { formatCurrency } from '../../utils/format';
import { aggregateSharesByCounterpart, AggregateShareRow } from '../../utils/shareAggregation';

type Props = AppScreenProps<'SettleUp'>;

function SettleUpScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: me } = useGetMeQuery();
  const { data: shares, isLoading } = useGetMySharesQuery();
  const [sendReminder] = useSendShareReminderMutation();

  const toCollectShares = useMemo(() => (shares ?? []).filter((s) => s.initiatorUserId === me?.id), [shares, me?.id]);
  const toPayShares = useMemo(() => (shares ?? []).filter((s) => s.ownerUserId === me?.id), [shares, me?.id]);

  const toCollect = useMemo(() => aggregateSharesByCounterpart(toCollectShares, true), [toCollectShares]);
  const toPay = useMemo(() => aggregateSharesByCounterpart(toPayShares, false), [toPayShares]);

  const totalCollect = toCollect.reduce((sum, r) => sum + r.amountPiastres, 0);
  const totalPay = toPay.reduce((sum, r) => sum + r.amountPiastres, 0);
  const net = totalCollect - totalPay;

  const groupCount = new Set([...toCollect, ...toPay].map((r) => r.groupId)).size;
  const peopleCount = new Set([...toCollect, ...toPay].map((r) => r.counterpartId ?? r.counterpartPhone)).size;

  const handleRemind = useCallback(async (row: AggregateShareRow) => {
    try {
      const results = await Promise.all(row.shareIds.map((id) => sendReminder(id).unwrap()));
      const sent = results.filter((r) => r.sent).length;
      const rateLimited = results.filter((r) => r.rateLimited).length;
      if (sent > 0) {
        Alert.alert(t('settleUp.remindSentTitle'), t('settleUp.remindSentMessage', { count: sent }));
      } else if (rateLimited > 0) {
        Alert.alert(t('settleUp.remindRateLimitedTitle'), t('settleUp.remindRateLimitedMessage'));
      } else {
        Alert.alert(t('common:error'), t('settleUp.remindFailed'));
      }
    } catch {
      Alert.alert(t('common:error'), t('settleUp.remindFailed'));
    }
  }, [sendReminder, t]);

  const handleRemindAll = useCallback(async () => {
    try {
      const ids = toCollect.flatMap((r) => r.shareIds);
      const results = await Promise.all(ids.map((id) => sendReminder(id).unwrap()));
      const sent = results.filter((r) => r.sent).length;
      const rateLimited = results.filter((r) => r.rateLimited).length;
      if (sent > 0) {
        Alert.alert(t('settleUp.remindSentTitle'), t('settleUp.remindSentMessage', { count: sent }));
      } else if (rateLimited > 0) {
        Alert.alert(t('settleUp.remindRateLimitedTitle'), t('settleUp.remindRateLimitedMessage'));
      } else {
        Alert.alert(t('common:error'), t('settleUp.remindFailed'));
      }
    } catch {
      Alert.alert(t('common:error'), t('settleUp.remindFailed'));
    }
  }, [toCollect, sendReminder, t]);

  const handlePay = useCallback((row: AggregateShareRow) => {
    navigation.navigate('PayShare', { groupId: row.groupId, groupName: row.groupName, billId: row.billId });
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeScreen style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeScreen>
    );
  }

  const isEmpty = toCollect.length === 0 && toPay.length === 0;

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('navigation:appStack.settleUpTitle')}</Text>
        {!isEmpty && net !== 0 && (
          <View style={[styles.netPill, net >= 0 ? styles.netPillPositive : styles.netPillNegative]}>
            <Text style={[typography.labelMedium, net >= 0 ? styles.netPillPositiveText : styles.netPillNegativeText]}>
              {t(net >= 0 ? 'settleUp.netPositive' : 'settleUp.netNegative', { amount: formatCurrency(Math.abs(net) / 100) })}
            </Text>
          </View>
        )}
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <CheckIcon size={40} color={Colors.success} strokeWidth={2} />
          <Text style={[typography.headingMedium, styles.emptyTitle]}>{t('settleUp.emptyTitle')}</Text>
          <Text style={[typography.bodyMedium, styles.emptySubtitle]}>{t('settleUp.emptySubtitle')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={[typography.amountLarge, net >= 0 ? styles.netPositive : styles.netNegative]}>
              {t(net >= 0 ? 'settleUp.heroPositive' : 'settleUp.heroNegative', { amount: formatCurrency(Math.abs(net) / 100) })}
            </Text>
            <Text style={[typography.labelMedium, styles.heroLabel]}>{t('settleUp.ifEveryoneSettles')}</Text>
            <Text style={[typography.bodySmall, styles.heroSub]}>
              {t('settleUp.acrossGroupsPeople', { groups: groupCount, people: peopleCount })}
            </Text>
          </View>

          <FlatList
            data={[
              ...(toCollect.length ? [{ type: 'header', label: t('settleUp.toCollect') } as const] : []),
              ...toCollect.map((r) => ({ type: 'row' as const, row: r, action: 'collect' as const })),
              ...(toPay.length ? [{ type: 'header', label: t('settleUp.toPay') } as const] : []),
              ...toPay.map((r) => ({ type: 'row' as const, row: r, action: 'pay' as const })),
            ]}
            keyExtractor={(item, idx) => (item.type === 'header' ? `h-${item.label}` : item.row.key) + idx}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return <Text style={[typography.headingSmall, styles.sectionHeader]}>{item.label}</Text>;
              }
              const { row, action } = item;
              return (
                <View style={styles.row}>
                  <Avatar name={row.counterpartName} seed={row.counterpartId ?? row.counterpartPhone} size={28} style={styles.avatarBorder} />
                  <View style={styles.rowInfo}>
                    <Text style={[typography.labelLarge, styles.rowName]}>{row.counterpartName}</Text>
                    <Text style={[typography.bodySmall, styles.rowGroup]}>{row.groupName}</Text>
                  </View>
                  <Text
                    style={[
                      typography.amountMedium,
                      styles.rowAmount,
                      action === 'collect' ? styles.rowAmountCollect : styles.rowAmountPay,
                    ]}>
                    {formatCurrency(row.amountPiastres / 100)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.rowAction, action === 'pay' && styles.rowActionPayBtn]}
                    onPress={() => (action === 'collect' ? handleRemind(row) : handlePay(row))}>
                    <Text style={[typography.labelMedium, action === 'pay' ? styles.rowActionPayText : styles.rowActionText]}>
                      {action === 'collect'
                        ? t(row.anyInitiated ? 'settleUp.resendAction' : 'settleUp.remindAction')
                        : t('settleUp.payAction')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            ListFooterComponent={
              <Text style={[typography.caption, styles.footerNote]}>{t('settleUp.footerNote')}</Text>
            }
          />

          {toCollect.length > 0 && (
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.remindAllBtn} onPress={handleRemindAll}>
                <Text style={[typography.labelLarge, styles.remindAllText]}>
                  {t('settleUp.remindEveryone', { amount: formatCurrency(totalCollect / 100) })}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeScreen>
  );
}

export default memo(SettleUpScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: Colors.text, flex: 1 },
  netPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  netPillPositive: { backgroundColor: Colors.successTint },
  netPillNegative: { backgroundColor: Colors.dangerTint },
  netPillPositiveText: { color: Colors.secondaryDark },
  netPillNegativeText: { color: Colors.danger },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },

  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    marginHorizontal: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  netPositive: { color: Colors.secondaryLight },
  netNegative: { color: Colors.accent },
  heroLabel: { color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionHeader: { color: Colors.text, marginTop: 16, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  avatarBorder: { borderWidth: 2, borderColor: Colors.surface },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.text },
  rowGroup: { color: Colors.textSecondary, marginTop: 2 },
  rowAmount: { marginRight: 4 },
  rowAmountCollect: { color: Colors.secondary },
  rowAmountPay: { color: Colors.danger },
  rowAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.tint },
  rowActionText: { color: Colors.primary },
  rowActionPayBtn: { backgroundColor: Colors.primary },
  rowActionPayText: { color: Colors.textOnPrimary },

  footerNote: { color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },

  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  remindAllBtn: { height: 52, borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  remindAllText: { color: Colors.textOnPrimary },
});
