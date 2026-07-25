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
import { formatCurrency } from '../../utils/format';

type Props = AppScreenProps<'MyLedger'>;

interface GroupRow {
  groupId: string;
  groupName: string;
  monthlyTotal: number;
  netBalance: number;
}

function MyLedgerScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: groups } = useGetGroupsQuery();
  const [ledgers, setLedgers] = useState<Record<string, GroupLedgerResponse>>({});

  const handleLedger = useCallback((groupId: string, ledger: GroupLedgerResponse) => {
    setLedgers((prev) => (prev[groupId] === ledger ? prev : { ...prev, [groupId]: ledger }));
  }, []);

  const rows: GroupRow[] = useMemo(
    () => (groups ?? [])
      .filter((g) => ledgers[g.id])
      .map((g) => ({
        groupId: g.id,
        groupName: g.name,
        monthlyTotal: ledgers[g.id]!.groupMonthlyTotal,
        netBalance: ledgers[g.id]!.currentUserNetBalance,
      })),
    [groups, ledgers],
  );

  const spentThisMonth = rows.reduce((sum, r) => sum + r.monthlyTotal, 0);
  const owedToMe = rows.filter((r) => r.netBalance > 0).reduce((sum, r) => sum + r.netBalance, 0);
  const iOwe = rows.filter((r) => r.netBalance < 0).reduce((sum, r) => sum - r.netBalance, 0);

  return (
    <SafeAreaView style={styles.container}>
      {(groups ?? []).map((g) => (
        <GroupLedgerCollector key={g.id} groupId={g.id} onLedger={handleLedger} />
      ))}

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.headingLarge, styles.back]}>‹</Text>
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('navigation:appStack.myLedgerTitle')}</Text>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧾</Text>
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
                <Text style={[typography.bodySmall, styles.heroLabel]}>{t('myLedger.spentThisMonth')}</Text>
                <Text style={[typography.amountLarge, styles.heroAmount]}>{formatCurrency(spentThisMonth / 100)}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[typography.labelMedium, styles.statLabel]}>{t('myLedger.youAreOwed')}</Text>
                    <Text style={[typography.labelLarge, styles.statOwed]}>{formatCurrency(owedToMe / 100)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[typography.labelMedium, styles.statLabel]}>{t('myLedger.youOwe')}</Text>
                    <Text style={[typography.labelLarge, styles.statOwe]}>{formatCurrency(iOwe / 100)}</Text>
                  </View>
                </View>
              </View>
              <Text style={[typography.labelMedium, styles.sectionHeader]}>{t('myLedger.byGroupHeader')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('GroupDetail', { groupId: item.groupId, groupName: item.groupName })}>
              <View style={styles.rowInfo}>
                <Text style={[typography.labelLarge, styles.rowName]}>{item.groupName}</Text>
                <Text style={[typography.bodySmall, styles.rowMeta]}>{formatCurrency(item.monthlyTotal / 100)}</Text>
              </View>
              {item.netBalance === 0 ? (
                <Text style={[typography.labelMedium, styles.settledText]}>{t('myLedger.settledLabel')}</Text>
              ) : (
                <Text style={[typography.labelLarge, item.netBalance > 0 ? styles.netPositive : styles.netNegative]}>
                  {item.netBalance > 0 ? '+' : '−'} {formatCurrency(Math.abs(item.netBalance) / 100)}
                </Text>
              )}
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
    marginBottom: 8,
  },
  heroLabel: { color: 'rgba(255,255,255,0.75)' },
  heroAmount: { color: '#fff', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  statItem: {},
  statLabel: { color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  statOwed: { color: Colors.secondaryLight },
  statOwe: { color: Colors.accent },

  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: { color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
  },
  rowInfo: {},
  rowName: { color: Colors.text },
  rowMeta: { color: Colors.textMuted, marginTop: 2 },
  settledText: { color: Colors.textMuted },
  netPositive: { color: Colors.secondaryDark },
  netNegative: { color: Colors.danger },
});
