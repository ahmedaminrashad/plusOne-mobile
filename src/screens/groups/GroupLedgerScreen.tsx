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
  const settledBills = ledger.bills.filter((b) => b.aggregateStatus === 'fully_settled');

  return (
    <FlatList
      data={settledBills}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <View style={styles.heroCard}>
            <Text style={[typography.bodySmall, styles.heroLabel]}>{t('groupLedger.spentThisMonth')}</Text>
            <Text style={[typography.amountLarge, styles.heroAmount]}>{formatCurrency(ledger.groupMonthlyTotal / 100)}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[typography.labelMedium, styles.statLabel]}>{t('groupLedger.youPaid')}</Text>
                <Text style={[typography.labelLarge, styles.statValue]}>
                  {formatCurrency(Math.max(0, ledger.currentUserNetBalance) / 100)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[typography.labelMedium, styles.statLabel]}>{t('groupLedger.yourFairShare')}</Text>
                <Text style={[typography.labelLarge, styles.statValue]}>{formatCurrency(yourFairShare / 100)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[typography.labelMedium, styles.statLabel]}>{t('groupLedger.balance')}</Text>
                <Text style={[typography.labelLarge, ledger.currentUserNetBalance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                  {ledger.currentUserNetBalance >= 0 ? '+' : '−'} {formatCurrency(Math.abs(ledger.currentUserNetBalance) / 100)}
                </Text>
              </View>
            </View>
          </View>
          {settledBills.length > 0 && (
            <Text style={[typography.labelMedium, styles.sectionHeader]}>{t('viewReceipt.closedBadge')}</Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.billRow}>
          <View style={styles.billInfo}>
            <Text style={[typography.labelLarge, styles.billTitle]}>{item.title ?? t('groupDetail.defaultBillName')}</Text>
            <Text style={[typography.bodySmall, styles.billDate]}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text style={[typography.labelLarge, styles.billAmount]}>{formatCurrency(item.amountPiastres / 100)}</Text>
        </View>
      )}
    />
  );
}

export default memo(GroupLedgerScreen);

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  heroCard: { backgroundColor: Colors.primary, borderRadius: Radius.xl, padding: 18, marginBottom: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.75)' },
  heroAmount: { color: '#fff', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  statItem: {},
  statLabel: { color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  statValue: { color: '#fff' },
  balancePositive: { color: Colors.secondaryLight },
  balanceNegative: { color: Colors.accent },

  sectionHeader: { color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
  },
  billInfo: {},
  billTitle: { color: Colors.text },
  billDate: { color: Colors.textMuted, marginTop: 2 },
  billAmount: { color: Colors.success },
});
