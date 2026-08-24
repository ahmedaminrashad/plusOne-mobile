import React, { useMemo, useState, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { LedgerBillSummary, useGetGroupLedgerQuery } from '../../store/api/ledgerApi';
import { formatCurrency, formatDate } from '../../utils/format';

const RECEIPT_PREVIEW = 20;

interface Props {
  groupId: string;
  onViewAllReceipts?: () => void;
  onOpenBill?: (billId: string) => void;
}

function GroupLedgerScreen({ groupId, onViewAllReceipts, onOpenBill }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: ledger, isLoading } = useGetGroupLedgerQuery(groupId);
  const [showAllReceipts, setShowAllReceipts] = useState(false);

  const receipts = useMemo(
    () => (ledger?.bills ?? []).filter((b) => b.aggregateStatus !== 'voided'),
    [ledger?.bills],
  );
  const previewReceipts = showAllReceipts ? receipts : receipts.slice(0, RECEIPT_PREVIEW);
  const hasMore = receipts.length > RECEIPT_PREVIEW;

  const { owedToYou, youOwe } = useMemo(() => {
    let owed = 0;
    let owe = 0;
    for (const row of ledger?.perCounterpartBreakdown ?? []) {
      if (row.direction === 'owes_you') owed += row.netAmountPiastres;
      else owe += row.netAmountPiastres;
    }
    return { owedToYou: owed, youOwe: owe };
  }, [ledger?.perCounterpartBreakdown]);

  if (isLoading || !ledger) {
    return <ActivityIndicator color={Colors.primary} style={styles.loader} />;
  }

  const now = new Date();
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const outingsThisMonth = receipts.filter((b) => isThisMonth(b.createdAt)).length;
  const net = ledger.currentUserNetBalance;

  const statusLabel = (bill: LedgerBillSummary) => {
    if (bill.aggregateStatus === 'fully_settled') return t('groupLedger.settledCheckmark');
    if (bill.aggregateStatus === 'partially_settled') return t('groupLedger.partiallySettled');
    return t('groupLedger.openStatus');
  };

  return (
    <FlatList
      data={previewReceipts}
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
            <View style={[styles.statCard, styles.statCardOwed]}>
              <Text style={[typography.labelMedium, styles.statLabelOwed]}>{t('groupLedger.youAreOwed')}</Text>
              <Text style={[typography.labelLarge, styles.statValueOwed]}>
                {formatCurrency(owedToYou / 100)}
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardOwe]}>
              <Text style={[typography.labelMedium, styles.statLabelOwe]}>{t('groupLedger.youOwe')}</Text>
              <Text style={[typography.labelLarge, styles.statValueOwe]}>
                {formatCurrency(youOwe / 100)}
              </Text>
            </View>
            <View style={[styles.statCard, net >= 0 ? styles.statCardOwed : styles.statCardOwe]}>
              <Text style={[typography.labelMedium, net >= 0 ? styles.statLabelOwed : styles.statLabelOwe]}>
                {t('groupLedger.balance')}
              </Text>
              <Text style={[typography.labelLarge, net >= 0 ? styles.statValueOwed : styles.statValueOwe]}>
                {net >= 0 ? '+' : '−'} {formatCurrency(Math.abs(net) / 100)}
              </Text>
            </View>
          </View>
          {receipts.length > 0 && (
            <View style={styles.sectionHeaderRow}>
              <Text style={[typography.headingSmall, styles.sectionHeader]}>{t('groupLedger.receiptsHeader')}</Text>
              {hasMore && (
                <TouchableOpacity
                  onPress={() => {
                    if (onViewAllReceipts) onViewAllReceipts();
                    else setShowAllReceipts(true);
                  }}
                  hitSlop={8}>
                  <Text style={[typography.labelMedium, styles.viewAll]}>{t('groupLedger.viewAll')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.billRow}
          onPress={() => onOpenBill?.(item.id)}
          activeOpacity={onOpenBill ? 0.75 : 1}
          disabled={!onOpenBill}>
          <View style={styles.billInfo}>
            <Text style={[typography.labelLarge, styles.billTitle]}>{item.title ?? t('groupDetail.defaultBillName')}</Text>
            <Text style={[typography.bodySmall, styles.billDate]}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.billRight}>
            <Text style={[typography.labelLarge, styles.billAmount]}>{formatCurrency(item.amountPiastres / 100)}</Text>
            <Text
              style={[
                typography.bodySmall,
                item.aggregateStatus === 'fully_settled' ? styles.billSettled : styles.billOpen,
              ]}>
              {statusLabel(item)}
            </Text>
          </View>
        </TouchableOpacity>
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
  statCardOwed: { backgroundColor: Colors.successTint },
  statCardOwe: { backgroundColor: Colors.dangerTint },
  statLabelOwed: { color: Colors.secondaryDark, marginBottom: 2 },
  statValueOwed: { color: Colors.success },
  statLabelOwe: { color: Colors.danger, marginBottom: 2 },
  statValueOwe: { color: Colors.danger },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: { color: Colors.text },
  viewAll: { color: Colors.primary },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 8,
  },
  billInfo: { flex: 1, marginRight: 12 },
  billTitle: { color: Colors.text },
  billDate: { color: Colors.textMuted, marginTop: 2 },
  billRight: { alignItems: 'flex-end' },
  billAmount: { color: Colors.text },
  billSettled: { color: Colors.success, marginTop: 2 },
  billOpen: { color: Colors.warningDark, marginTop: 2 },
});
