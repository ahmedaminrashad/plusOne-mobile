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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useCreateBillMutation } from '../../store/api/billsApi';
import { GroupMember, ParsedReceiptData } from '../../types/models';
import { formatCurrency, resolveAssetUrl } from '../../utils/format';
import i18n from '../../i18n';

type Props = AppScreenProps<'AssignItems'>;
type SplitMode = 'byItem' | 'equally';

interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  claimedBy: string[];
}

const getMemberId = (m: GroupMember) => m.userId ?? m.id;
const getMemberName = (m: GroupMember) =>
  m.user?.displayName ?? m.pendingPhone ?? i18n.t('billing:receiptSplit.defaultMemberName');

function MemberChip({ member, selected, onToggle }: { member: GroupMember; selected: boolean; onToggle: () => void }) {
  const typography = useTypography();
  const name = getMemberName(member);
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.chipAvatar, selected && styles.chipAvatarSelected]}>
        <Text style={[typography.labelMedium, styles.chipInitial, selected && styles.chipInitialSelected]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={[typography.labelSmall, styles.chipName, selected && styles.chipNameSelected]} numberOfLines={1}>
        {name.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );
}

function ItemRow({
  item,
  members,
  mode,
  onToggle,
}: {
  item: ReceiptItem;
  members: GroupMember[];
  mode: SplitMode;
  onToggle: (itemId: string, memberId: string) => void;
}) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const subtotal = item.price * item.qty;
  const unclaimed = item.claimedBy.length === 0;
  return (
    <View style={[styles.itemCard, mode === 'byItem' && unclaimed && styles.itemCardUnclaimed]}>
      <View style={styles.itemHeader}>
        <Text style={[typography.amountMedium, styles.itemSubtotal]}>{formatCurrency(subtotal)}</Text>
        <View style={styles.itemNameBlock}>
          <Text style={[typography.labelLarge, styles.itemName]}>{item.name}</Text>
          {item.qty > 1 && (
            <Text style={[typography.bodySmall, styles.itemQty]}>{item.qty} × {item.price.toFixed(2)}</Text>
          )}
        </View>
      </View>
      {mode === 'byItem' && (
        <>
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
          {unclaimed && <Text style={[typography.caption, styles.unclaimedNote]}>{t('receiptSplit.unclaimedNote')}</Text>}
          {item.claimedBy.length > 1 && (
            <Text style={[typography.caption, styles.splitNote]}>
              {t('receiptSplit.perPersonShare', { amount: formatCurrency(subtotal / item.claimedBy.length) })}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

function AssignItemsScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const { groupId, groupName, receiptJson } = route.params;

  const { data: members } = useGetGroupMembersQuery(groupId);
  const { data: me } = useGetMeQuery();
  const [createBill, { isLoading: isSaving }] = useCreateBillMutation();

  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [receipt, setReceipt] = useState<ParsedReceiptData>({ items: [] });
  const [paidByUserId, setPaidByUserId] = useState('');
  const [payerModalVisible, setPayerModalVisible] = useState(false);
  const [mode, setMode] = useState<SplitMode>('byItem');

  const activeMembers = useMemo(
    () => (members ?? []).filter((m) => m.status === 'active' && (m.userId || m.pendingPhone)),
    [members],
  );

  useEffect(() => {
    try {
      const parsed: ParsedReceiptData = JSON.parse(receiptJson);
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
      Alert.alert(t('common:error'), t('receiptSplit.parseFailed'), [
        { text: t('common:back'), onPress: () => navigation.goBack() },
      ]);
    }
  }, [receiptJson, navigation]);

  useEffect(() => {
    if (me && !paidByUserId) setPaidByUserId(me.id);
  }, [me, paidByUserId]);

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.price * it.qty, 0), [items]);

  const taxAmt = useMemo(() => {
    if (receipt.tax == null) return 0;
    return receipt.taxType === 'percent' ? subtotal * receipt.tax / 100 : receipt.tax;
  }, [receipt.tax, receipt.taxType, subtotal]);

  const serviceAmt = useMemo(() => {
    if (receipt.service == null) return 0;
    return receipt.serviceType === 'percent' ? subtotal * receipt.service / 100 : receipt.service;
  }, [receipt.service, receipt.serviceType, subtotal]);

  const tipAmt = useMemo(() => {
    if (receipt.tip == null) return 0;
    return receipt.tipType === 'percent' ? (subtotal + taxAmt + serviceAmt) * receipt.tip / 100 : receipt.tip;
  }, [receipt.tip, receipt.tipType, subtotal, taxAmt, serviceAmt]);

  const grandTotal = receipt.grandTotal ?? (subtotal + taxAmt + serviceAmt + tipAmt);

  const memberTotals = useMemo(() => {
    if (mode === 'equally') {
      if (!activeMembers.length) return {};
      const share = grandTotal / activeMembers.length;
      const totals: Record<string, number> = {};
      for (const m of activeMembers) totals[getMemberId(m)] = share;
      return totals;
    }

    const totals: Record<string, number> = {};
    for (const item of items) {
      if (!item.claimedBy.length) continue;
      const share = (item.price * item.qty) / item.claimedBy.length;
      for (const id of item.claimedBy) totals[id] = (totals[id] ?? 0) + share;
    }
    const extras = taxAmt + serviceAmt + tipAmt;
    if (extras > 0 && subtotal > 0) {
      for (const id of Object.keys(totals)) {
        const share = totals[id]! / subtotal;
        totals[id] = totals[id]! + extras * share;
      }
    }
    return totals;
  }, [mode, activeMembers, grandTotal, items, taxAmt, serviceAmt, tipAmt, subtotal]);

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
    t('receiptSplit.selectPayerFallback');

  const doSave = useCallback(async () => {
    const breakdownLines = activeMembers
      .filter((m) => memberTotals[getMemberId(m)] !== undefined)
      .map((m) => t('receiptSplit.breakdownLine', { name: getMemberName(m), amount: formatCurrency(memberTotals[getMemberId(m)]!) }));

    const notesParts: string[] = [];
    if (receipt.storeName ?? receipt.venueName) {
      notesParts.push(t('receiptSplit.fromVenue', { venue: receipt.storeName ?? receipt.venueName }));
    }
    if (breakdownLines.length) notesParts.push(t('receiptSplit.breakdownHeader'), ...breakdownLines);

    const shares = activeMembers
      .filter((m) => m.userId !== paidByUserId && memberTotals[getMemberId(m)] !== undefined)
      .map((m) => ({
        groupMemberId: m.id,
        amountPiastres: Math.floor(memberTotals[getMemberId(m)]! * 100),
      }))
      .filter((s) => s.amountPiastres > 0);

    try {
      await createBill({
        groupId,
        venueName: receipt.venueName ?? receipt.storeName,
        amount: grandTotal,
        paidByUserId,
        notes: notesParts.join('\n') || undefined,
        captureMethod: receipt.captureMethod ?? 'manual',
        sourceRef: receipt.sourceRef,
        receiptPhotoUrl: receipt.receiptPhotoUrl,
        lineItems: items.map((it) => ({ name: it.name, qty: it.qty, unitPrice: it.price })),
        tax: receipt.tax,
        taxType: receipt.taxType,
        service: receipt.service,
        serviceType: receipt.serviceType,
        tip: receipt.tip,
        tipType: receipt.tipType,
        shares,
      }).unwrap();
      navigation.navigate('GroupDetail', { groupId, groupName });
    } catch {
      Alert.alert(t('common:error'), t('receiptSplit.saveFailed'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMembers, memberTotals, receipt, grandTotal, paidByUserId, groupId, groupName, items, createBill, navigation]);

  const handleSave = useCallback(async () => {
    if (!paidByUserId) {
      Alert.alert(t('common:error'), t('receiptSplit.selectPayerRequired'));
      return;
    }
    if (mode === 'byItem') {
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
    }
    doSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidByUserId, mode, items, doSave]);

  const renderItem = useCallback(
    ({ item }: { item: ReceiptItem }) => (
      <ItemRow item={item} members={activeMembers} mode={mode} onToggle={toggleClaim} />
    ),
    [activeMembers, mode, toggleClaim],
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.receiptHeader}>
        <Text style={[typography.headingLarge, styles.title]}>{t('assignItems.title')}</Text>

        <View style={styles.totalRow}>
          <Text style={[typography.amountLarge, styles.totalAmount]}>{formatCurrency(grandTotal)}</Text>
          {(receipt.storeName ?? receipt.venueName) ? (
            <Text style={[typography.bodyMedium, styles.storeName]}> · {receipt.venueName ?? receipt.storeName}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.paidByRow} onPress={() => setPayerModalVisible(true)}>
          <Text style={[typography.labelMedium, styles.paidByLabel]}>{t('assignItems.paidByLabel')}</Text>
          <Avatar name={payerName} size={26} />
          <Text style={[typography.labelLarge, styles.paidByName]}>{payerName}</Text>
          <Text style={styles.paidByArrow}>▾</Text>
        </TouchableOpacity>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'byItem' && styles.modeBtnActive]}
            onPress={() => setMode('byItem')}>
            <Text style={[typography.labelMedium, styles.modeBtnText, mode === 'byItem' && styles.modeBtnTextActive]}>
              {t('assignItems.modeByItem')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'equally' && styles.modeBtnActive]}
            onPress={() => setMode('equally')}>
            <Text style={[typography.labelMedium, styles.modeBtnText, mode === 'equally' && styles.modeBtnTextActive]}>
              {t('assignItems.modeEqually')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [receipt, grandTotal, payerName, mode, t, typography],
  );

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

      <View style={styles.bottomPanel}>
        {summaryRows.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={[typography.labelMedium, styles.summaryTitle]}>{t('receiptSplit.paymentSummaryTitle')}</Text>
            {summaryRows.map((m) => {
              const id = getMemberId(m);
              return (
                <View key={m.id} style={styles.summaryRow}>
                  <Text style={[typography.labelLarge, styles.summaryAmount]}>{formatCurrency(memberTotals[id]!)}</Text>
                  <View style={styles.summaryMember}>
                    <Text style={[typography.bodyMedium, styles.summaryName]}>{getMemberName(m)}</Text>
                    <Avatar uri={resolveAssetUrl(m.user?.photoUrl)} name={getMemberName(m)} size={24} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Button title={t('assignItems.saveButton')} onPress={handleSave} loading={isSaving} style={styles.saveBtn} />
      </View>

      <Modal visible={payerModalVisible} transparent animationType="slide" onRequestClose={() => setPayerModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPayerModalVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={[typography.headingSmall, styles.modalTitle]}>{t('receiptSplit.payerQuestionLabel')}</Text>
            {activeMembers.map((m) => {
              const id = getMemberId(m);
              const selected = id === paidByUserId;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerOption, selected && styles.payerOptionSelected]}
                  onPress={() => { setPaidByUserId(id); setPayerModalVisible(false); }}>
                  <Avatar uri={resolveAssetUrl(m.user?.photoUrl)} name={getMemberName(m)} size={36} />
                  <Text style={[typography.bodyLarge, styles.payerOptionName, selected && styles.payerOptionNameSelected]}>
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

export default memo(AssignItemsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 8 },

  receiptHeader: { padding: 20, backgroundColor: Colors.surface, marginBottom: 12, gap: 10 },
  title: { color: Colors.text },
  totalRow: { flexDirection: 'row', alignItems: 'baseline' },
  totalAmount: { color: Colors.text },
  storeName: { color: Colors.textMuted },

  paidByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.tint,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  paidByLabel: { color: Colors.textSecondary },
  paidByName: { color: Colors.text },
  paidByArrow: { fontSize: 11, color: Colors.textMuted },

  modeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.textOnPrimary },

  itemCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: Radius.lg,
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
  itemName: { color: Colors.text, textAlign: 'right' },
  itemQty: { color: Colors.textMuted, marginTop: 2 },
  itemSubtotal: { color: Colors.text, marginLeft: 8 },

  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 56,
  },
  chipSelected: { backgroundColor: Colors.tint, borderColor: Colors.primary },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarSelected: { backgroundColor: Colors.primary },
  chipInitial: { color: Colors.textSecondary },
  chipInitialSelected: { color: '#fff' },
  chipName: { color: Colors.textSecondary },
  chipNameSelected: { color: Colors.primary },

  unclaimedNote: { color: Colors.warning, textAlign: 'right', marginTop: 6 },
  splitNote: { color: Colors.textMuted, textAlign: 'right', marginTop: 4 },

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
  summaryTitle: { color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryMember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryName: { color: Colors.text },
  summaryAmount: { color: Colors.primary },

  saveBtn: { marginHorizontal: 16, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: { color: Colors.text, textAlign: 'center', marginBottom: 12 },
  payerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  payerOptionSelected: { backgroundColor: Colors.tint },
  payerOptionName: { flex: 1, color: Colors.text, textAlign: 'right' },
  payerOptionNameSelected: { color: Colors.primary },
  checkmark: { fontSize: 18, color: Colors.primary },
});
