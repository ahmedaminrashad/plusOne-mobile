import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
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
import { ChevronLeftIcon, CheckIcon, ChevronDownIcon } from '../../components/icons';

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
  const id = getMemberId(member);
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onToggle} activeOpacity={0.7}>
      <Avatar name={name} seed={id} size={26} />
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
        <View style={styles.itemNameBlock}>
          <Text style={[typography.labelLarge, styles.itemName]}>{item.name}</Text>
          {item.qty > 1 && (
            <Text style={[typography.bodySmall, styles.itemQty]}>{item.qty} × {item.price.toFixed(2)}</Text>
          )}
        </View>
        <Text style={[typography.amountMedium, styles.itemSubtotal]}>{formatCurrency(subtotal)}</Text>
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
      const mapped = parsed.items.map((it, idx) => ({
        id: it.id ?? String(idx),
        name: it.name,
        price: Number(it.price),
        qty: Number(it.qty ?? 1),
        claimedBy: [],
      }));
      setItems(mapped);
    } catch {
      Alert.alert(t('common:error'), t('receiptSplit.parseFailed'), [
        { text: t('common:back'), onPress: () => navigation.goBack() },
      ]);
    }
  }, [receiptJson, navigation, t]);

  useEffect(() => {
    if (me && !paidByUserId) setPaidByUserId(me.id);
  }, [me, paidByUserId]);

  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.price * it.qty, 0), [items]);

  const taxAmt = useMemo(() => {
    if (receipt.tax == null) return 0;
    return receipt.taxType === 'percent' ? subtotal * receipt.tax / 100 : receipt.tax;
  }, [receipt.tax, receipt.taxType, subtotal]);

  const deliveryAmt = useMemo(() => {
    if (receipt.delivery == null) return 0;
    return receipt.deliveryType === 'percent' ? subtotal * receipt.delivery / 100 : receipt.delivery;
  }, [receipt.delivery, receipt.deliveryType, subtotal]);

  const vatAmt = useMemo(() => {
    if (receipt.vat == null) return 0;
    return receipt.vatType === 'percent' ? (subtotal + taxAmt + deliveryAmt) * receipt.vat / 100 : receipt.vat;
  }, [receipt.vat, receipt.vatType, subtotal, taxAmt, deliveryAmt]);

  const grandTotal = receipt.grandTotal ?? (subtotal + taxAmt + deliveryAmt + vatAmt);

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
    const extras = taxAmt + deliveryAmt + vatAmt;
    if (extras > 0 && subtotal > 0) {
      for (const id of Object.keys(totals)) {
        const share = totals[id]! / subtotal;
        totals[id] = totals[id]! + extras * share;
      }
    }
    return totals;
  }, [mode, activeMembers, grandTotal, items, taxAmt, deliveryAmt, vatAmt, subtotal]);

  const unassignedTotal = useMemo(() => {
    if (mode !== 'byItem') return 0;
    return items.filter((it) => it.claimedBy.length === 0).reduce((sum, it) => sum + it.price * it.qty, 0);
  }, [items, mode]);

  const assignedTotal = subtotal - unassignedTotal;

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
        amountPiastres: Math.round(memberTotals[getMemberId(m)]! * 100),
      }))
      .filter((s) => s.amountPiastres > 0);

    const sharesTotalPiastres = shares.reduce((sum, s) => sum + s.amountPiastres, 0);
    // Bill amount must cover share sum (SHARES_EXCEED_BILL_TOTAL); prefer computed total over a stale OCR override.
    const amount = Math.max(grandTotal, sharesTotalPiastres / 100);

    try {
      await createBill({
        groupId,
        venueName: receipt.venueName ?? receipt.storeName,
        amount,
        paidByUserId,
        notes: notesParts.join('\n') || undefined,
        captureMethod: receipt.captureMethod ?? 'manual',
        sourceRef: receipt.sourceRef,
        receiptPhotoUrl: receipt.receiptPhotoUrl,
        lineItems: items.map((it) => ({ name: it.name, qty: it.qty, unitPrice: it.price })),
        tax: receipt.tax,
        taxType: receipt.taxType,
        delivery: receipt.delivery,
        deliveryType: receipt.deliveryType,
        vat: receipt.vat,
        vatType: receipt.vatType,
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
      <ItemRow
        item={item}
        members={activeMembers}
        mode={mode}
        onToggle={toggleClaim}
      />
    ),
    [activeMembers, mode, toggleClaim],
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.receiptHeader}>
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeftIcon size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[typography.headingLarge, styles.title]}>{t('assignItems.title')}</Text>
        </View>

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
          <ChevronDownIcon size={13} color={Colors.textMuted} strokeWidth={2} />
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
    [receipt, grandTotal, payerName, mode, t, typography, navigation],
  );

  const summaryRows = activeMembers.filter((m) => memberTotals[getMemberId(m)] !== undefined);

  return (
    <SafeScreen style={styles.container}>
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
              const name = getMemberName(m);
              const isPayer = id === paidByUserId;
              return (
                <View key={m.id} style={styles.summaryRow}>
                  <Avatar uri={resolveAssetUrl(m.user?.photoUrl)} name={name} seed={id} size={24} />
                  <View style={styles.summaryMember}>
                    <Text style={[typography.bodyMedium, styles.summaryName]}>{name}</Text>
                    {isPayer && (
                      <Text style={[typography.caption, styles.summarySubtitle]}>{t('receiptSplit.paidTheReceiptSuffix')}</Text>
                    )}
                  </View>
                  <Text style={[typography.labelLarge, styles.summaryAmount]}>{formatCurrency(memberTotals[id]!)}</Text>
                </View>
              );
            })}
            {mode === 'byItem' && items.length > 0 && (
              <>
                <View style={styles.summarySeparator} />
                <Text style={[typography.bodySmall, styles.assignedNote]}>
                  {t('receiptSplit.assignedWithCharges', { amount: formatCurrency(assignedTotal) })}
                  {unassignedTotal > 0 && (
                    <>
                      {' · '}
                      {t('receiptSplit.unassignedLabel')}
                      <Text style={styles.unassignedAmt}> {formatCurrency(unassignedTotal)}</Text>
                    </>
                  )}
                </Text>
              </>
            )}
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
                  {selected && <CheckIcon size={16} color={Colors.primary} strokeWidth={2} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeScreen>
  );
}

export default memo(AssignItemsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingBottom: 8 },

  receiptHeader: { padding: 20, backgroundColor: Colors.surface, marginBottom: 12, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
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

  modeRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.neutral200,
    borderRadius: Radius.pill,
    padding: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.pill, alignItems: 'center' },
  modeBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  modeBtnText: { color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.primary },

  itemCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: Radius.xl,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  itemCardUnclaimed: { borderWidth: 1.5, borderColor: Colors.dangerTint },
  itemCardSelected: { borderWidth: 1.5, borderColor: Colors.primary },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  itemNameBlock: { flex: 1, alignItems: 'flex-start' },
  itemName: { color: Colors.text, textAlign: 'left' },
  itemQty: { color: Colors.textMuted, marginTop: 2 },
  itemSubtotal: { color: Colors.text, marginLeft: 8, textAlign: 'right' },

  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
    minWidth: 54,
  },
  chipSelected: { backgroundColor: Colors.tint },
  chipName: { color: Colors.textSecondary },
  chipNameSelected: { color: Colors.primary },

  unclaimedNote: { color: Colors.danger, textAlign: 'left', marginTop: 6 },
  splitNote: { color: Colors.textMuted, textAlign: 'left', marginTop: 4 },

  bottomPanel: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    paddingBottom: 16,
  },
  summarySection: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: Radius.xl,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  summaryTitle: { color: Colors.textSecondary, textAlign: 'left', marginBottom: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryMember: { flex: 1 },
  summaryName: { color: Colors.text },
  summarySubtitle: { color: Colors.textMuted, marginTop: 1 },
  summaryAmount: { color: Colors.text },
  summarySeparator: { height: 1, backgroundColor: Colors.borderLight, marginTop: 2, marginBottom: 2 },
  assignedNote: { color: Colors.textSecondary },
  unassignedAmt: { color: Colors.danger },

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
});
