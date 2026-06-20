import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useCreateBillMutation } from '../../store/api/billsApi';
import { GroupMember } from '../../types/models';

type Props = AppScreenProps<'ReceiptSplit'>;

interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  claimedBy: string[]; // userId or member.id for pending
}

interface ParsedReceipt {
  storeName?: string;
  items: { id?: string; name: string; price: number; qty?: number }[];
}

const getMemberId = (m: GroupMember) => m.userId ?? m.id;
const getMemberName = (m: GroupMember) => m.user?.displayName ?? m.pendingPhone ?? 'مستخدم';

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
  const initial = name.charAt(0).toUpperCase();
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onToggle}
      activeOpacity={0.7}>
      <View style={[styles.chipAvatar, selected && styles.chipAvatarSelected]}>
        <Text style={[styles.chipInitial, selected && styles.chipInitialSelected]}>{initial}</Text>
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
  item: ReceiptItem;
  members: GroupMember[];
  onToggle: (itemId: string, memberId: string) => void;
}) {
  const subtotal = item.price * item.qty;
  const unclaimed = item.claimedBy.length === 0;

  return (
    <View style={[styles.itemCard, unclaimed && styles.itemCardUnclaimed]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemSubtotal}>{subtotal.toFixed(2)} ج.م</Text>
        <View style={styles.itemNameBlock}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.qty > 1 && (
            <Text style={styles.itemQty}>{item.qty} × {item.price.toFixed(2)}</Text>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}>
        {members.map((m) => (
          <MemberChip
            key={m.id}
            member={m}
            selected={item.claimedBy.includes(getMemberId(m))}
            onToggle={() => onToggle(item.id, getMemberId(m))}
          />
        ))}
      </ScrollView>

      {unclaimed && <Text style={styles.unclaimedNote}>لم يُختر لها أحد بعد</Text>}
      {item.claimedBy.length > 1 && (
        <Text style={styles.splitNote}>
          {(subtotal / item.claimedBy.length).toFixed(2)} ج.م على كل شخص
        </Text>
      )}
    </View>
  );
}

function ReceiptSplitScreen({ route, navigation }: Props) {
  const { groupId, groupName, receiptJson } = route.params;

  const { data: members } = useGetGroupMembersQuery(groupId);
  const { data: me } = useGetMeQuery();
  const [createBill, { isLoading: isSaving }] = useCreateBillMutation();

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [receipt, setReceipt] = useState<ParsedReceipt>({ items: [] });
  const [paidByUserId, setPaidByUserId] = useState('');
  const [payerModalVisible, setPayerModalVisible] = useState(false);

  const activeMembers = useMemo(
    () => (members ?? []).filter((m) => m.status === 'active' && (m.userId || m.pendingPhone)),
    [members],
  );

  // Parse receipt JSON on mount
  useEffect(() => {
    try {
      const parsed: ParsedReceipt = JSON.parse(receiptJson);
      setReceipt(parsed);
      setItems(
        parsed.items.map((it, idx) => ({
          id: it.id ?? String(idx),
          name: it.name,
          price: Number(it.price),
          qty: Number(it.qty ?? 1),
          claimedBy: [],
        })),
      );
    } catch {
      Alert.alert('خطأ', 'تعذر قراءة بيانات الإيصال', [
        { text: 'رجوع', onPress: () => navigation.goBack() },
      ]);
    }
  }, [receiptJson, navigation]);

  useEffect(() => {
    if (me && !paidByUserId) setPaidByUserId(me.id);
  }, [me, paidByUserId]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items],
  );

  const memberTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const item of items) {
      if (!item.claimedBy.length) continue;
      const share = (item.price * item.qty) / item.claimedBy.length;
      for (const id of item.claimedBy) {
        totals[id] = (totals[id] ?? 0) + share;
      }
    }
    return totals;
  }, [items]);

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

  const payerName =
    activeMembers.find((m) => getMemberId(m) === paidByUserId)?.user?.displayName ??
    me?.displayName ??
    'اختر من دفع';

  const handleSave = useCallback(async () => {
    if (!paidByUserId) {
      Alert.alert('خطأ', 'يرجى تحديد من دفع الإيصال');
      return;
    }
    const unclaimedItems = items.filter((i) => i.claimedBy.length === 0);
    if (unclaimedItems.length > 0) {
      Alert.alert(
        'أصناف غير محددة',
        `${unclaimedItems.length} صنف لم يُختر لها أحد. هل تريد المتابعة؟`,
        [
          { text: 'راجع', style: 'cancel' },
          { text: 'متابعة', onPress: doSave },
        ],
      );
      return;
    }
    doSave();
  }, [paidByUserId, items]);

  const doSave = useCallback(async () => {
    const breakdownLines = activeMembers
      .filter((m) => memberTotals[getMemberId(m)] !== undefined)
      .map((m) => `${getMemberName(m)}: ${memberTotals[getMemberId(m)]!.toFixed(2)} ج.م`);

    const notes = [
      receipt.storeName ? `من: ${receipt.storeName}` : null,
      'التوزيع:',
      ...breakdownLines,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await createBill({
        groupId,
        title: receipt.storeName || 'إيصال QR',
        amount: total,
        paidByUserId,
        notes,
      }).unwrap();
      navigation.navigate('GroupDetail', { groupId, groupName });
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الإيصال، حاول مرة أخرى');
    }
  }, [activeMembers, memberTotals, receipt, total, paidByUserId, groupId, groupName, createBill, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: ReceiptItem }) => (
      <ItemRow item={item} members={activeMembers} onToggle={toggleClaim} />
    ),
    [activeMembers, toggleClaim],
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.receiptHeader}>
        {receipt.storeName ? <Text style={styles.storeName}>{receipt.storeName}</Text> : null}
        <Text style={styles.totalLabel}>الإجمالي</Text>
        <Text style={styles.totalAmount}>{total.toFixed(2)} ج.م</Text>
        <Text style={styles.sectionTitle}>اختر من أخذ كل صنف</Text>
      </View>
    ),
    [receipt.storeName, total],
  );

  // Per-member summary at bottom
  const summaryRows = activeMembers.filter((m) => memberTotals[getMemberId(m)] !== undefined);

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

      {/* Sticky bottom panel */}
      <View style={styles.bottomPanel}>
        {summaryRows.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>ملخص الدفع</Text>
            {summaryRows.map((m) => {
              const id = getMemberId(m);
              return (
                <View key={m.id} style={styles.summaryRow}>
                  <Text style={styles.summaryAmount}>{memberTotals[id]!.toFixed(2)} ج.م</Text>
                  <View style={styles.summaryMember}>
                    <Text style={styles.summaryName}>{getMemberName(m)}</Text>
                    <Avatar uri={m.user?.photoUrl} name={getMemberName(m)} size={24} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.payerRow} onPress={() => setPayerModalVisible(true)}>
          <Text style={styles.payerArrow}>▼</Text>
          <View style={styles.payerInfo}>
            <Text style={styles.payerLabel}>من دفع الإيصال؟</Text>
            <Text style={styles.payerName}>{payerName}</Text>
          </View>
          <Text style={styles.payerIcon}>💳</Text>
        </TouchableOpacity>

        <Button
          title="حفظ الإيصال"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveBtn}
        />
      </View>

      {/* Payer picker modal */}
      <Modal
        visible={payerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayerModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPayerModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>من دفع الإيصال؟</Text>
            {activeMembers.map((m) => {
              const id = getMemberId(m);
              const selected = id === paidByUserId;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerOption, selected && styles.payerOptionSelected]}
                  onPress={() => { setPaidByUserId(id); setPayerModalVisible(false); }}>
                  <Avatar uri={m.user?.photoUrl} name={getMemberName(m)} size={36} />
                  <Text style={[styles.payerOptionName, selected && styles.payerOptionNameSelected]}>
                    {getMemberName(m)}
                  </Text>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(ReceiptSplitScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 8 },

  receiptHeader: { padding: 20, alignItems: 'center', backgroundColor: Colors.surface, marginBottom: 12 },
  storeName: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
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

  // Bottom panel
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
  summaryMember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryName: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  summaryAmount: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  payerIcon: { fontSize: 20 },
  payerInfo: { flex: 1 },
  payerLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  payerName: { fontSize: 15, fontWeight: '600', color: Colors.text, textAlign: 'right' },
  payerArrow: { fontSize: 12, color: Colors.textMuted },

  saveBtn: { marginHorizontal: 16, marginTop: 4 },

  // Payer modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 12 },
  payerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  payerOptionSelected: { backgroundColor: Colors.primary + '10' },
  payerOptionName: { flex: 1, fontSize: 16, color: Colors.text, textAlign: 'right' },
  payerOptionNameSelected: { color: Colors.primary, fontWeight: '600' },
  checkmark: { fontSize: 18, color: Colors.primary },
});
