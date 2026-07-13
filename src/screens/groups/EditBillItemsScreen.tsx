import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Button from '../../components/common/Button';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useGetBillDetailQuery, useUpdateBillItemsMutation } from '../../store/api/billsApi';
import { GroupMember } from '../../types/models';
import { formatCurrency } from '../../utils/format';
import i18n from '../../i18n';

type Props = AppScreenProps<'EditBillItems'>;

interface EditableItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  claimedBy: string[];
}

const getMemberId = (m: GroupMember) => m.userId ?? m.id;
const getMemberName = (m: GroupMember) =>
  m.user?.displayName ?? m.pendingPhone ?? i18n.t('billing:receiptSplit.defaultMemberName');

function MemberChip({
  member,
  selected,
  onToggle,
}: {
  member: GroupMember;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = getMemberName(member);
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onToggle}
      activeOpacity={0.7}>
      <View style={[styles.chipAvatar, selected && styles.chipAvatarSelected]}>
        <Text style={[styles.chipInitial, selected && styles.chipInitialSelected]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.chipName, selected && styles.chipNameSelected]} numberOfLines={1}>
        {name.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );
}

function ItemRow({
  item,
  members,
  onToggle,
}: {
  item: EditableItem;
  members: GroupMember[];
  onToggle: (itemId: string, memberId: string) => void;
}) {
  const { t } = useTranslation('billing');
  const subtotal = item.price * item.qty;
  const unclaimed = item.claimedBy.length === 0;
  return (
    <View style={[styles.itemCard, unclaimed && styles.itemCardUnclaimed]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemSubtotal}>{formatCurrency(subtotal)}</Text>
        <View style={styles.itemNameBlock}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.qty > 1 && (
            <Text style={styles.itemQty}>{item.qty} × {item.price.toFixed(2)}</Text>
          )}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {members.map((m) => (
          <MemberChip
            key={m.id}
            member={m}
            selected={item.claimedBy.includes(getMemberId(m))}
            onToggle={() => onToggle(item.id, getMemberId(m))}
          />
        ))}
      </ScrollView>
      {unclaimed && <Text style={styles.unclaimedNote}>{t('receiptSplit.unclaimedNote')}</Text>}
      {item.claimedBy.length > 1 && (
        <Text style={styles.splitNote}>
          {t('receiptSplit.perPersonShare', { amount: formatCurrency(subtotal / item.claimedBy.length) })}
        </Text>
      )}
    </View>
  );
}

function EditBillItemsScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const { billId } = route.params;

  const { data: bill, isLoading } = useGetBillDetailQuery(billId);
  const { data: members } = useGetGroupMembersQuery(bill?.groupId ?? '', { skip: !bill });
  const [updateBillItems, { isLoading: isSaving }] = useUpdateBillItemsMutation();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const activeMembers = useMemo(
    () => (members ?? []).filter((m) => m.status === 'active' && (m.userId || m.pendingPhone)),
    [members],
  );

  useEffect(() => {
    if (!bill || hydrated) return;
    setItems(
      (bill.lineItems ?? []).map((it, idx) => ({
        id: String(idx),
        name: it.name,
        price: Number(it.unitPrice),
        qty: Number(it.qty),
        claimedBy: it.claimedBy ?? [],
      })),
    );
    setHydrated(true);
  }, [bill, hydrated]);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items],
  );

  const taxAmt = useMemo(() => {
    if (!bill || bill.tax == null) return 0;
    return bill.taxType === 'percent' ? subtotal * bill.tax / 100 : bill.tax;
  }, [bill, subtotal]);

  const serviceAmt = useMemo(() => {
    if (!bill || bill.service == null) return 0;
    return bill.serviceType === 'percent' ? subtotal * bill.service / 100 : bill.service;
  }, [bill, subtotal]);

  const tipAmt = useMemo(() => {
    if (!bill || bill.tip == null) return 0;
    return bill.tipType === 'percent'
      ? (subtotal + taxAmt + serviceAmt) * bill.tip / 100
      : bill.tip;
  }, [bill, subtotal, taxAmt, serviceAmt]);

  const memberTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const item of items) {
      if (!item.claimedBy.length) continue;
      const share = (item.price * item.qty) / item.claimedBy.length;
      for (const id of item.claimedBy) {
        totals[id] = (totals[id] ?? 0) + share;
      }
    }
    const extras = taxAmt + serviceAmt + tipAmt;
    if (extras > 0 && subtotal > 0) {
      for (const id of Object.keys(totals)) {
        const share = totals[id]! / subtotal;
        totals[id] = totals[id]! + extras * share;
      }
    }
    return totals;
  }, [items, taxAmt, serviceAmt, tipAmt, subtotal]);

  const toggleClaim = useCallback((itemId: string, memberId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const claimedBy = item.claimedBy.includes(memberId)
          ? item.claimedBy.filter((id) => id !== memberId)
          : [...item.claimedBy, memberId];
        return { ...item, claimedBy };
      }),
    );
  }, []);

  const doSave = useCallback(async () => {
    if (!bill) return;
    const shares = activeMembers
      .filter((m) => m.userId !== bill.paidByUserId && memberTotals[getMemberId(m)] !== undefined)
      .map((m) => ({
        groupMemberId: m.id,
        amountPiastres: Math.floor(memberTotals[getMemberId(m)]! * 100),
      }))
      .filter((s) => s.amountPiastres > 0);

    try {
      await updateBillItems({
        billId,
        lineItems: items.map((it) => ({
          name: it.name,
          qty: it.qty,
          unitPrice: it.price,
          claimedBy: it.claimedBy,
        })),
        shares,
      }).unwrap();
      navigation.goBack();
    } catch {
      Alert.alert(t('common:error'), t('editBillItems.saveFailed'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill, activeMembers, memberTotals, items, billId, updateBillItems, navigation]);

  const handleSave = useCallback(() => {
    const unclaimedItems = items.filter((i) => i.claimedBy.length === 0);
    if (unclaimedItems.length > 0) {
      Alert.alert(
        t('receiptSplit.unclaimedItemsTitle'),
        t('receiptSplit.unclaimedItemsMessage', { count: unclaimedItems.length }),
        [
          { text: t('receiptSplit.reviewButton'), style: 'cancel' },
          { text: t('common:continue'), onPress: doSave },
        ],
      );
      return;
    }
    doSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, doSave]);

  const renderItem = useCallback(
    ({ item }: { item: EditableItem }) => (
      <ItemRow item={item} members={activeMembers} onToggle={toggleClaim} />
    ),
    [activeMembers, toggleClaim],
  );

  if (isLoading || !bill) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!bill.isEditable) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyText}>{t('editBillItems.billClosedMessage')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summaryRows = activeMembers.filter((m) => memberTotals[getMemberId(m)] !== undefined);

  const ListHeader = (
    <View style={styles.receiptHeader}>
      <Text style={styles.totalLabel}>{t('receiptSplit.grandTotalLabel')}</Text>
      <Text style={styles.totalAmount}>{formatCurrency(Number(bill.amount), bill.currency)}</Text>
      <Text style={styles.sectionTitle}>{t('receiptSplit.chooseItemsHint')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.bottomPanel}>
        {summaryRows.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>{t('receiptSplit.paymentSummaryTitle')}</Text>
            {summaryRows.map((m) => {
              const id = getMemberId(m);
              return (
                <View key={m.id} style={styles.summaryRow}>
                  <Text style={styles.summaryAmount}>{formatCurrency(memberTotals[id]!)}</Text>
                  <Text style={styles.summaryName}>{getMemberName(m)}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Button
          title={t('editBillItems.saveButton')}
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveBtn}
        />
      </View>
    </SafeAreaView>
  );
}

export default memo(EditBillItemsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 8 },
  loader: { flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },

  receiptHeader: { padding: 20, alignItems: 'center', backgroundColor: Colors.surface, marginBottom: 12 },
  totalLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 8 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  sectionTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 12, fontWeight: '600' },

  itemCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  itemCardUnclaimed: { borderWidth: 1.5, borderColor: Colors.warning + '55' },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  itemNameBlock: { flex: 1, alignItems: 'flex-end' },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text, textAlign: 'right' },
  itemQty: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemSubtotal: { fontSize: 16, fontWeight: '700', color: Colors.text, marginLeft: 8 },

  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 56,
  },
  chipSelected: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarSelected: { backgroundColor: Colors.primary },
  chipInitial: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  chipInitialSelected: { color: '#fff' },
  chipName: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  chipNameSelected: { color: Colors.primary, fontWeight: '700' },

  unclaimedNote: { fontSize: 11, color: Colors.warning, textAlign: 'right', marginTop: 6 },
  splitNote: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },

  bottomPanel: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 16,
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 8,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  summaryAmount: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  saveBtn: { marginHorizontal: 16, marginTop: 4 },
});
