import React, { useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Avatar from '../../components/common/Avatar';
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
      await Promise.all(row.shareIds.map((id) => sendReminder(id).unwrap()));
    } catch {
      Alert.alert(t('common:error'), t('settleUp.remindFailed'));
    }
  }, [sendReminder, t]);

  const handleRemindAll = useCallback(async () => {
    try {
      await Promise.all(toCollect.flatMap((r) => r.shareIds).map((id) => sendReminder(id).unwrap()));
    } catch {
      Alert.alert(t('common:error'), t('settleUp.remindFailed'));
    }
  }, [toCollect, sendReminder, t]);

  const handlePay = useCallback((row: AggregateShareRow) => {
    navigation.navigate('PayShare', { groupId: row.groupId, groupName: row.groupName, billId: row.billId });
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const isEmpty = toCollect.length === 0 && toPay.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.headingLarge, styles.back]}>‹</Text>
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('navigation:appStack.settleUpTitle')}</Text>
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={[typography.headingMedium, styles.emptyTitle]}>{t('settleUp.emptyTitle')}</Text>
          <Text style={[typography.bodyMedium, styles.emptySubtitle]}>{t('settleUp.emptySubtitle')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={[typography.amountLarge, net >= 0 ? styles.netPositive : styles.netNegative]}>
              {t(net >= 0 ? 'settleUp.netPositive' : 'settleUp.netNegative', { amount: formatCurrency(Math.abs(net) / 100) })}
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
                return <Text style={[typography.labelMedium, styles.sectionHeader]}>{item.label}</Text>;
              }
              const { row, action } = item;
              return (
                <View style={styles.row}>
                  <Avatar name={row.counterpartName} size={40} />
                  <View style={styles.rowInfo}>
                    <Text style={[typography.labelLarge, styles.rowName]}>{row.counterpartName}</Text>
                    <Text style={[typography.bodySmall, styles.rowGroup]}>{row.groupName}</Text>
                  </View>
                  <Text style={[typography.amountMedium, styles.rowAmount]}>{formatCurrency(row.amountPiastres / 100)}</Text>
                  <TouchableOpacity
                    style={styles.rowAction}
                    onPress={() => (action === 'collect' ? handleRemind(row) : handlePay(row))}>
                    <Text style={[typography.labelMedium, styles.rowActionText]}>
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
    </SafeAreaView>
  );
}

export default memo(SettleUpScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { color: Colors.accent },
  title: { color: Colors.text },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
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
  heroLabel: { color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5, marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionHeader: { color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 8,
  },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.text },
  rowGroup: { color: Colors.textMuted, marginTop: 2 },
  rowAmount: { color: Colors.text, marginRight: 4 },
  rowAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.tint },
  rowActionText: { color: Colors.primary },

  footerNote: { color: Colors.textMuted, textAlign: 'center', marginTop: 8 },

  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  remindAllBtn: { height: 52, borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  remindAllText: { color: Colors.textOnPrimary },
});
