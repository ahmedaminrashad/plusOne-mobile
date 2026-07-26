import React, { memo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useGetGroupLedgerQuery } from '../../store/api/ledgerApi';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { formatCurrency, formatDate } from '../../utils/format';

interface Props {
  groupId: string;
}

function GroupLedgerScreen({ groupId }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: ledger, isLoading } = useGetGroupLedgerQuery(groupId);
  const { data: members } = useGetGroupMembersQuery(groupId);

  if (isLoading || !ledger) {
    return <ActivityIndicator color={Colors.primary} style={styles.loader} />;
  }

  const activeMemberCount = Math.max(1, (members ?? []).filter((m) => m.status === 'active').length);
  const yourFairShare = ledger.groupMonthlyTotal / activeMemberCount;

  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const outingsThisMonth = ledger.bills.filter((b) => b.aggregateStatus !== 'voided' && isThisMonth(b.createdAt)).length;
  const settledBills = ledger.bills.filter((b) => b.aggregateStatus === 'fully_settled' && isThisMonth(b.createdAt));

  return (
    <FlatList
      data={settledBills}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroSpent}>
                <Text style={[typography.bodySmall, styles.heroLabel]}>{t('groupLedger.spentThisMonth')}</Text>
                <Text style={[typography.amountLarge, styles.heroAmount]}>{formatCurrency(ledger.groupMonthlyTotal / 100)}</Text>
              </View>
              <View style={styles.heroOutings}>
                <Text style={[typography.bodySmall, styles.heroLabel]}>{t('groupLedger.outingsLabel')}</Text>
                <Text style={[typography.amountLarge, styles.heroAmount]}>{outingsThisMonth}</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardNeutral]}>
              <Text style={[typography.labelMedium, styles.statLabelNeutral]}>{t('groupLedger.youPaid')}</Text>
              <Text style={[typography.labelLarge, styles.statValueNeutral]}>
                {formatCurrency(Math.max(0, ledger.currentUserNetBalance) / 100)}
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardNeutral]}>
              <Text style={[typography.labelMedium, styles.statLabelNeutral]}>{t('groupLedger.yourFairShare')}</Text>
              <Text style={[typography.labelLarge, styles.statValueNeutral]}>{formatCurrency(yourFairShare / 100)}</Text>
            </View>
            <View style={[styles.statCard, ledger.currentUserNetBalance >= 0 ? styles.statCardOwed : styles.statCardOwe]}>
              <Text style={[typography.labelMedium, ledger.currentUserNetBalance >= 0 ? styles.statLabelOwed : styles.statLabelOwe]}>
                {t('groupLedger.balance')}
              </Text>
              <Text style={[typography.labelLarge, ledger.currentUserNetBalance >= 0 ? styles.statValueOwed : styles.statValueOwe]}>
                {ledger.currentUserNetBalance >= 0 ? '+' : '−'} {formatCurrency(Math.abs(ledger.currentUserNetBalance) / 100)}
              </Text>
            </View>
          </View>
          {settledBills.length > 0 && (
            <Text style={[typography.headingSmall, styles.sectionHeader]}>{t('groupLedger.settledThisMonth')}</Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.billRow}>
          <View style={styles.billInfo}>
            <Text style={[typography.labelLarge, styles.billTitle]}>{item.title ?? t('groupDetail.defaultBillName')}</Text>
            <Text style={[typography.bodySmall, styles.billDate]}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.billRight}>
            <Text style={[typography.labelLarge, styles.billAmount]}>{formatCurrency(item.amountPiastres / 100)}</Text>
            <Text style={[typography.bodySmall, styles.billSettled]}>{t('groupLedger.settledCheckmark')}</Text>
          </View>
        </View>
      )}
    />
  );
}

export default memo(GroupLedgerScreen);

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  heroCard: { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: 18, marginBottom: 12 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroSpent: {},
  heroOutings: { alignItems: 'flex-end' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  heroAmount: { color: '#fff', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: Radius.xl, padding: 12 },
  statCardNeutral: { backgroundColor: Colors.surface },
  statCardOwed: { backgroundColor: Colors.successTint },
  statCardOwe: { backgroundColor: Colors.dangerTint },
  statLabelNeutral: { color: Colors.textSecondary, marginBottom: 2 },
  statValueNeutral: { color: Colors.text },
  statLabelOwed: { color: Colors.secondaryDark, marginBottom: 2 },
  statValueOwed: { color: Colors.success },
  statLabelOwe: { color: Colors.danger, marginBottom: 2 },
  statValueOwe: { color: Colors.danger },

  sectionHeader: { color: Colors.text, marginTop: 16, marginBottom: 8 },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 8,
  },
  billInfo: {},
  billTitle: { color: Colors.text },
  billDate: { color: Colors.textMuted, marginTop: 2 },
  billRight: { alignItems: 'flex-end' },
  billAmount: { color: Colors.text },
  billSettled: { color: Colors.success, marginTop: 2 },
});
