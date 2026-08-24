import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { GroupLedgerResponse } from '../../store/api/ledgerApi';
import GroupLedgerCollector from '../../components/groups/GroupLedgerCollector';
import { formatCurrency, formatDate } from '../../utils/format';
import { ChevronLeftIcon, ChevronRightIcon, ReceiptIcon } from '../../components/icons';

type Props = AppScreenProps<'MyLedger'>;

interface GroupRow {
  groupId: string;
  groupName: string;
  monthlyTotal: number;
  netBalance: number;
  outingsCount: number;
  settledRatio: number;
}

function MyLedgerScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: groups } = useGetGroupsQuery();
  const [ledgers, setLedgers] = useState<Record<string, GroupLedgerResponse>>({});

  const handleLedger = useCallback((groupId: string, ledger: GroupLedgerResponse) => {
    setLedgers((prev) => (prev[groupId] === ledger ? prev : { ...prev, [groupId]: ledger }));
  }, []);

  const rows: GroupRow[] = useMemo(() => {
    const now = new Date();
    return (groups ?? [])
      .filter((g) => ledgers[g.id])
      .map((g) => {
        const ledger = ledgers[g.id]!;
        // "Outings" and the settled fraction are scoped to bills created this
        // month, mirroring how the backend computes groupMonthlyTotal.
        const monthBills = ledger.bills.filter((b) => {
          if (b.aggregateStatus === 'voided') return false;
          const created = new Date(b.createdAt);
          return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
        });
        const settledAmount = monthBills
          .filter((b) => b.aggregateStatus === 'fully_settled')
          .reduce((sum, b) => sum + b.amountPiastres, 0);
        return {
          groupId: g.id,
          groupName: g.name,
          monthlyTotal: ledger.groupMonthlyTotal,
          netBalance: ledger.currentUserNetBalance,
          outingsCount: monthBills.length,
          settledRatio: ledger.groupMonthlyTotal > 0 ? settledAmount / ledger.groupMonthlyTotal : 0,
        };
      });
  }, [groups, ledgers]);

  const spentThisMonth = rows.reduce((sum, r) => sum + r.monthlyTotal, 0);
  const outingsThisMonth = rows.reduce((sum, r) => sum + r.outingsCount, 0);
  const owedToMe = rows.filter((r) => r.netBalance > 0).reduce((sum, r) => sum + r.netBalance, 0);
  const iOwe = rows.filter((r) => r.netBalance < 0).reduce((sum, r) => sum - r.netBalance, 0);
  const monthLabel = formatDate(new Date(), { month: 'short' });

  return (
    <SafeAreaView style={styles.container}>
      {(groups ?? []).map((g) => (
        <GroupLedgerCollector key={g.id} groupId={g.id} onLedger={handleLedger} />
      ))}

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backChip} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={18} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={[typography.headingMedium, styles.title]}>{t('navigation:appStack.myLedgerTitle')}</Text>
          <Text style={[typography.bodySmall, styles.subtitle]}>{t('myLedger.allGroupsSubtitle')}</Text>
        </View>
        {null}
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <ReceiptIcon size={40} color={Colors.textSecondary} />
          <Text style={[typography.headingMedium, styles.emptyTitle]}>{t('myLedger.emptyTitle')}</Text>
          <Text style={[typography.bodyMedium, styles.emptySubtitle]}>{t('myLedger.emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.groupId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <View style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroSpent}>
                    <Text style={[typography.bodySmall, styles.heroLabel]}>{t('myLedger.spentThisMonth')}</Text>
                    <Text style={[typography.amountLarge, styles.heroAmount]}>{formatCurrency(spentThisMonth / 100)}</Text>
                  </View>
                  <View style={styles.heroOutings}>
                    <Text style={[typography.bodySmall, styles.heroLabel]}>{t('myLedger.outingsLabel')}</Text>
                    <Text style={[typography.amountLarge, styles.heroAmount]}>{outingsThisMonth}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statCardOwed]}>
                  <Text style={[typography.labelMedium, styles.statLabelOwed]}>{t('myLedger.youAreOwed')}</Text>
                  <Text style={[typography.labelLarge, styles.statValueOwed]}>{formatCurrency(owedToMe / 100)}</Text>
                </View>
                <View style={[styles.statCard, styles.statCardOwe]}>
                  <Text style={[typography.labelMedium, styles.statLabelOwe]}>{t('myLedger.youOwe')}</Text>
                  <Text style={[typography.labelLarge, styles.statValueOwe]}>{formatCurrency(iOwe / 100)}</Text>
                </View>
              </View>
              <Text style={[typography.labelMedium, styles.sectionHeader]}>{t('myLedger.byGroupHeader')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('GroupDetail', { groupId: item.groupId, groupName: item.groupName })}>
              <View style={styles.rowTop}>
                <View style={styles.rowInfo}>
                  <Text style={[typography.labelLarge, styles.rowName]}>{item.groupName}</Text>
                  <Text style={[typography.bodySmall, styles.rowMeta]}>
                    {t('myLedger.outingsMeta', { count: item.outingsCount, amount: formatCurrency(item.monthlyTotal / 100) })}
                  </Text>
                </View>
                {item.netBalance === 0 ? (
                  <View style={styles.settledPill}>
                    <Text style={[typography.labelMedium, styles.settledPillText]}>{t('myLedger.settledLabel')}</Text>
                  </View>
                ) : (
                  <Text style={[typography.labelLarge, item.netBalance > 0 ? styles.netPositive : styles.netNegative]}>
                    {item.netBalance > 0 ? '+' : '−'} {formatCurrency(Math.abs(item.netBalance) / 100)}
                  </Text>
                )}
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, item.settledRatio * 100))}%` },
                  ]}
                />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

export default memo(MyLedgerScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backChip: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  titleBlock: { flex: 1 },
  title: { color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: 1 },
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  monthChipText: { color: Colors.text },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },

  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    marginHorizontal: 16,
    padding: 18,
    marginBottom: 12,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroSpent: {},
  heroOutings: { alignItems: 'flex-end' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  heroAmount: { color: '#fff', marginTop: 6 },

  statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: Radius.xl, padding: 14 },
  statCardOwed: { backgroundColor: Colors.successTint },
  statCardOwe: { backgroundColor: Colors.dangerTint },
  statLabelOwed: { color: Colors.secondaryDark, marginBottom: 2 },
  statValueOwed: { color: Colors.success },
  statLabelOwe: { color: Colors.danger, marginBottom: 2 },
  statValueOwe: { color: Colors.danger },

  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: { color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 8,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.text },
  rowMeta: { color: Colors.textMuted, marginTop: 2 },
  settledPill: { borderRadius: Radius.pill, backgroundColor: Colors.tint, paddingHorizontal: 10, paddingVertical: 4 },
  settledPillText: { color: Colors.primary },
  netPositive: { color: Colors.success },
  netNegative: { color: Colors.danger },
  progressTrack: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceElevated,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.success,
  },
});
