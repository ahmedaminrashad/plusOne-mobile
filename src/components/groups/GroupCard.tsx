import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Group } from '../../types/models';
import Avatar from '../common/Avatar';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useGetGroupLedgerQuery } from '../../store/api/ledgerApi';
import { resolveAssetUrl, formatCurrency, formatRelativeTime } from '../../utils/format';

const VISIBLE_AVATARS = 4;

interface Props {
  group: Group;
  onPress: () => void;
}

function GroupCard({ group, onPress }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const activeMembers = useMemo(() => group.members?.filter((m) => m.status === 'active') ?? [], [group.members]);
  const { data: ledger } = useGetGroupLedgerQuery(group.id);
  const net = ledger?.currentUserNetBalance ?? 0;
  const openBills = ledger?.bills.filter((b) => b.aggregateStatus !== 'fully_settled' && b.aggregateStatus !== 'voided') ?? [];
  const lastBill = ledger?.bills[0];

  const visibleMembers = activeMembers.slice(0, VISIBLE_AVATARS);
  const overflowCount = activeMembers.length - visibleMembers.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.topRow}>
        <Text style={[typography.labelLarge, styles.cardName]} numberOfLines={1}>{group.name}</Text>
        {net !== 0 && (
          <View style={[styles.balancePill, net > 0 ? styles.balancePositive : styles.balanceNegative]}>
            <Text style={[typography.labelMedium, net > 0 ? styles.balancePositiveText : styles.balanceNegativeText]}>
              {net > 0 ? '+' : '−'} {formatCurrency(Math.abs(net) / 100)}
            </Text>
          </View>
        )}
      </View>

      <Text style={[typography.bodySmall, styles.cardMeta]}>
        {openBills.length > 0
          ? t('home.cardMeta', { members: activeMembers.length, bills: openBills.length })
          : t('home.cardMetaNoBills', { members: activeMembers.length })}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.avatarStack}>
          {visibleMembers.map((m, i) => (
            <Avatar
              key={m.id}
              uri={resolveAssetUrl(m.user?.photoUrl)}
              name={m.user?.displayName ?? m.pendingPhone ?? t('groupDetail.defaultUserName')}
              seed={m.userId ?? m.id}
              size={28}
              style={[styles.avatarStackItem, i > 0 && { marginLeft: -8 }]}
            />
          ))}
          {overflowCount > 0 && (
            <View style={[styles.avatarStackItem, styles.overflowBadge, { marginLeft: -8 }]}>
              <Text style={[typography.labelSmall, styles.overflowText]}>+{overflowCount}</Text>
            </View>
          )}
        </View>
        {lastBill && (
          <Text style={[typography.bodySmall, styles.lastActivity]} numberOfLines={1}>
            {lastBill.title ?? t('groupDetail.defaultBillName')} · {formatRelativeTime(lastBill.createdAt)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default memo(GroupCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 15,
    marginBottom: 10,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { color: Colors.text, flexShrink: 1 },
  cardMeta: { color: Colors.textMuted, marginTop: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarStackItem: { borderWidth: 2, borderColor: Colors.surface },
  overflowBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.neutral200,
    justifyContent: 'center', alignItems: 'center',
  },
  overflowText: { color: Colors.textSecondary },
  lastActivity: { color: Colors.textMuted, flexShrink: 1, marginLeft: 8 },
  balancePill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  balancePositive: { backgroundColor: Colors.successTint },
  balanceNegative: { backgroundColor: Colors.dangerTint },
  balancePositiveText: { color: Colors.secondaryDark },
  balanceNegativeText: { color: Colors.danger },
});
