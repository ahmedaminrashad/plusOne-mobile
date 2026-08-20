import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useGetBillDetailQuery, useUpdateBillItemsMutation } from '../../store/api/billsApi';
import { GroupMember, TaxServiceType } from '../../types/models';
import { formatCurrency, resolveAssetUrl } from '../../utils/format';
import { useInputTextAlign } from '../../utils/rtl';
import { useKeyboardInsetHeight } from '../../services/keyboardInsets';
import i18n from '../../i18n';
import { LockIcon, PlusIcon, CheckIcon } from '../../components/icons';

type Props = AppScreenProps<'EditBillItems'>;

interface EditableItem {
  id: string;
  name: string;
  price: string;
  qty: number;
  claimedBy: string[];
}

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

const getMemberId = (m: GroupMember) => m.userId ?? m.id;
const getMemberName = (m: GroupMember) =>
  m.user?.displayName ?? m.pendingPhone ?? i18n.t('billing:receiptSplit.defaultMemberName');

function AmountTypeToggle({
  value,
  onChange,
}: {
  value: TaxServiceType;
  onChange: (v: TaxServiceType) => void;
}) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  return (
    <View style={styles.toggle}>
      <TouchableOpacity
        style={[styles.toggleBtn, value === 'percent' && styles.toggleBtnActive]}
        onPress={() => onChange('percent')}>
        <Text style={[typography.labelLarge, styles.toggleText, value === 'percent' && styles.toggleTextActive]}>%</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleBtn, value === 'amount' && styles.toggleBtnActive]}
        onPress={() => onChange('amount')}>
        <Text style={[typography.labelLarge, styles.toggleText, value === 'amount' && styles.toggleTextActive]}>{t('common:currencyEGP')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MemberChip({
  member,
  selected,
  onToggle,
}: {
  member: GroupMember;
  selected: boolean;
  onToggle: () => void;
}) {
  const typography = useTypography();
  const name = getMemberName(member);
  const id = getMemberId(member);
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onToggle}
      activeOpacity={0.7}>
      <Avatar name={name} seed={id} size={26} />
      <Text style={[typography.labelSmall, styles.chipName, selected && styles.chipNameSelected]} numberOfLines={1}>
        {name.split(' ')[0]}
      </Text>
      {selected && <CheckIcon size={13} color={Colors.textOnPrimary} strokeWidth={2.75} />}
    </TouchableOpacity>
  );
}

function ItemRow({
  item,
  members,
  onToggle,
  onPriceChange,
}: {
  item: EditableItem;
  members: GroupMember[];
  onToggle: (itemId: string, memberId: string) => void;
  onPriceChange: (itemId: string, price: string) => void;
}) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const subtotal = parseNum(item.price) * item.qty;
  const unclaimed = item.claimedBy.length === 0;
  return (
    <View style={[styles.itemCard, unclaimed && styles.itemCardUnclaimed]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemNameBlock}>
          <Text style={[typography.labelLarge, styles.itemName]}>{item.name}</Text>
          {item.qty > 1 && (
            <Text style={[typography.bodySmall, styles.itemQty]}>{item.qty} ×</Text>
          )}
        </View>
        <View style={styles.priceCol}>
          <TextInput
            style={[typography.bodySmall, styles.priceInput]}
            value={item.price}
            onChangeText={(v) => onPriceChange(item.id, v)}
            keyboardType="decimal-pad"
            textAlign="right"
          />
          <Text style={[typography.amountMedium, styles.itemSubtotal]}>{formatCurrency(subtotal)}</Text>
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
      {unclaimed && <Text style={[typography.caption, styles.unclaimedNote]}>{t('receiptSplit.unclaimedNote')}</Text>}
      {item.claimedBy.length > 1 && (
        <Text style={[typography.caption, styles.splitNote]}>
          {t('receiptSplit.perPersonShare', { amount: formatCurrency(subtotal / item.claimedBy.length) })}
        </Text>
      )}
    </View>
  );
}

function EditBillItemsScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const inputAlign = useInputTextAlign();
  const { billId } = route.params;

  const { data: bill, isLoading } = useGetBillDetailQuery(billId);
  const { data: members } = useGetGroupMembersQuery(bill?.groupId ?? '', { skip: !bill });
  const [updateBillItems, { isLoading: isSaving }] = useUpdateBillItemsMutation();

  const [items, setItems] = useState<EditableItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [taxValue, setTaxValue] = useState('');
  const [taxType, setTaxType] = useState<TaxServiceType>('percent');
  const [deliveryValue, setDeliveryValue] = useState('');
  const [deliveryType, setDeliveryType] = useState<TaxServiceType>('percent');
  const [vatValue, setVatValue] = useState('');
  const [vatType, setVatType] = useState<TaxServiceType>('percent');
  const keyboardInset = useKeyboardInsetHeight();

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
        price: String(it.unitPrice),
        qty: Number(it.qty),
        claimedBy: it.claimedBy ?? [],
      })),
    );
    setTaxValue(bill.tax != null ? String(bill.tax) : '');
    setTaxType(bill.taxType ?? 'percent');
    setDeliveryValue(bill.delivery != null ? String(bill.delivery) : '');
    setDeliveryType(bill.deliveryType ?? 'percent');
    setVatValue(bill.vat != null ? String(bill.vat) : '');
    setVatType(bill.vatType ?? 'percent');
    setHydrated(true);
  }, [bill, hydrated]);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + parseNum(it.price) * it.qty, 0),
    [items],
  );

  const taxAmt = useMemo(() => {
    if (!taxValue.trim()) return 0;
    return taxType === 'percent' ? subtotal * parseNum(taxValue) / 100 : parseNum(taxValue);
  }, [taxValue, taxType, subtotal]);

  const deliveryAmt = useMemo(() => {
    if (!deliveryValue.trim()) return 0;
    return deliveryType === 'percent' ? subtotal * parseNum(deliveryValue) / 100 : parseNum(deliveryValue);
  }, [deliveryValue, deliveryType, subtotal]);

  const vatAmt = useMemo(() => {
    if (!vatValue.trim()) return 0;
    return vatType === 'percent'
      ? (subtotal + taxAmt + deliveryAmt) * parseNum(vatValue) / 100
      : parseNum(vatValue);
  }, [vatValue, vatType, subtotal, taxAmt, deliveryAmt]);

  const grandTotal = subtotal + taxAmt + deliveryAmt + vatAmt;

  const memberTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const item of items) {
      if (!item.claimedBy.length) continue;
      const share = (parseNum(item.price) * item.qty) / item.claimedBy.length;
      for (const id of item.claimedBy) {
        totals[id] = (totals[id] ?? 0) + share;
      }
    }
    const extras = taxAmt + deliveryAmt + vatAmt;
    if (extras > 0 && subtotal > 0) {
      for (const id of Object.keys(totals)) {
        const share = totals[id]! / subtotal;
        totals[id] = totals[id]! + extras * share;
      }
    }
    return totals;
  }, [items, taxAmt, deliveryAmt, vatAmt, subtotal]);

  const handleAddItem = useCallback(() => {
    const name = newItemName.trim();
    const qty = parseInt(newItemQty, 10);
    const price = parseNum(newItemPrice);
    if (!name || price <= 0 || !qty || qty <= 0) {
      Alert.alert(t('common:error'), t('editBillItems.addItemInvalid'));
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, price: newItemPrice.trim(), qty, claimedBy: [] },
    ]);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
  }, [newItemName, newItemQty, newItemPrice, t]);

  const updateItemPrice = useCallback((itemId: string, price: string) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, price } : item)));
  }, []);

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
        amountPiastres: Math.round(memberTotals[getMemberId(m)]! * 100),
      }))
      .filter((s) => s.amountPiastres > 0);

    try {
      await updateBillItems({
        billId,
        lineItems: items.map((it) => ({
          name: it.name,
          qty: it.qty,
          unitPrice: parseNum(it.price),
          claimedBy: it.claimedBy,
        })),
        tax: taxValue.trim() ? parseNum(taxValue) : null,
        taxType: taxValue.trim() ? taxType : null,
        delivery: deliveryValue.trim() ? parseNum(deliveryValue) : null,
        deliveryType: deliveryValue.trim() ? deliveryType : null,
        vat: vatValue.trim() ? parseNum(vatValue) : null,
        vatType: vatValue.trim() ? vatType : null,
        shares,
      }).unwrap();
      navigation.goBack();
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'data' in err
          ? String((err as { data?: { message?: string } }).data?.message ?? '')
          : '';
      const message =
        code.includes('SHARE_ALREADY_PAID_LOCKED') || code.includes('BILL_FULLY_SETTLED')
          ? t('editBillItems.billClosedMessage')
          : t('editBillItems.saveFailed');
      Alert.alert(t('common:error'), message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bill, activeMembers, memberTotals, items, billId, updateBillItems, navigation,
    taxValue, taxType, deliveryValue, deliveryType, vatValue, vatType,
  ]);

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
      <ItemRow item={item} members={activeMembers} onToggle={toggleClaim} onPriceChange={updateItemPrice} />
    ),
    [activeMembers, toggleClaim, updateItemPrice],
  );

  if (isLoading || !bill) {
    return (
      <SafeScreen style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeScreen>
    );
  }

  if (bill.aggregateStatus === 'fully_settled') {
    return (
      <SafeScreen style={styles.container}>
        <View style={styles.emptyState}>
          <LockIcon size={44} color={Colors.textMuted} />
          <Text style={[typography.bodyLarge, styles.emptyText]}>{t('editBillItems.billClosedMessage')}</Text>
        </View>
      </SafeScreen>
    );
  }

  const summaryRows = activeMembers.filter((m) => memberTotals[getMemberId(m)] !== undefined);

  const ListHeader = (
    <View style={styles.receiptHeader}>
      <Text style={[typography.caption, styles.totalLabel]}>{t('receiptSplit.grandTotalLabel')}</Text>
      <Text style={[typography.amountLarge, styles.totalAmount]}>{formatCurrency(grandTotal, bill.currency)}</Text>
      <Text style={[typography.labelMedium, styles.sectionTitle]}>{t('receiptSplit.chooseItemsHint')}</Text>
    </View>
  );

  const ListFooter = (
    <View>
      <View style={styles.extrasPanel}>
        <Text style={[typography.labelMedium, styles.extrasLabel]}>{t('createBill.taxLabel')}</Text>
        <View style={styles.amountTypeRow}>
          <TextInput
            style={[typography.bodyLarge, styles.extrasInput, styles.flex1]}
            value={taxValue}
            onChangeText={setTaxValue}
            placeholder={taxType === 'percent' ? t('createBill.taxPlaceholderPercent') : t('createBill.taxPlaceholderAmount')}
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            textAlign={inputAlign}
          />
          <AmountTypeToggle value={taxType} onChange={setTaxType} />
        </View>

        <Text style={[typography.labelMedium, styles.extrasLabel]}>{t('createBill.vatLabel')}</Text>
        <View style={styles.amountTypeRow}>
          <TextInput
            style={[typography.bodyLarge, styles.extrasInput, styles.flex1]}
            value={vatValue}
            onChangeText={setVatValue}
            placeholder={vatType === 'percent' ? t('createBill.vatPlaceholderPercent') : t('createBill.vatPlaceholderAmount')}
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            textAlign={inputAlign}
          />
          <AmountTypeToggle value={vatType} onChange={setVatType} />
        </View>

        <Text style={[typography.labelMedium, styles.extrasLabel]}>{t('createBill.deliveryLabel')}</Text>
        <View style={styles.amountTypeRow}>
          <TextInput
            style={[typography.bodyLarge, styles.extrasInput, styles.flex1]}
            value={deliveryValue}
            onChangeText={setDeliveryValue}
            placeholder={deliveryType === 'percent' ? t('createBill.deliveryPlaceholderPercent') : t('createBill.deliveryPlaceholderAmount')}
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            textAlign={inputAlign}
          />
          <AmountTypeToggle value={deliveryType} onChange={setDeliveryType} />
        </View>
      </View>

      <View style={[styles.addItemPanel, keyboardInset > 0 && { paddingBottom: 8 }]}>
        <Text style={[typography.labelMedium, styles.addItemTitle]}>{t('editBillItems.addItemTitle')}</Text>
        <View style={styles.addItemRow}>
          <TextInput
            style={[typography.bodyMedium, styles.addItemInput, styles.addItemInputName]}
            placeholder={t('createBill.itemNamePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={newItemName}
            onChangeText={setNewItemName}
          />
          <TextInput
            style={[typography.bodyMedium, styles.addItemInput, styles.addItemInputQty]}
            placeholder={t('createBill.qtyPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={newItemQty}
            onChangeText={setNewItemQty}
            keyboardType="number-pad"
          />
          <TextInput
            style={[typography.bodyMedium, styles.addItemInput, styles.addItemInputPrice]}
            placeholder={t('createBill.pricePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={newItemPrice}
            onChangeText={setNewItemPrice}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.addItemBtn} onPress={handleAddItem} activeOpacity={0.8}>
            <PlusIcon size={18} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeScreen style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.bottomPanel, keyboardInset > 0 && { paddingBottom: keyboardInset + 12 }]}>
        {summaryRows.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={[typography.labelMedium, styles.summaryTitle]}>{t('receiptSplit.paymentSummaryTitle')}</Text>
            {summaryRows.map((m) => {
              const id = getMemberId(m);
              const name = getMemberName(m);
              return (
                <View key={m.id} style={styles.summaryRow}>
                  <Avatar uri={resolveAssetUrl(m.user?.photoUrl)} name={name} seed={id} size={24} />
                  <Text style={[typography.bodyMedium, styles.summaryName]}>{name}</Text>
                  <Text style={[typography.labelLarge, styles.summaryAmount]}>{formatCurrency(memberTotals[id]!)}</Text>
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
    </SafeScreen>
  );
}

export default memo(EditBillItemsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  list: { paddingBottom: 8 },
  loader: { flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyText: { color: Colors.textMuted, textAlign: 'center' },

  receiptHeader: { padding: 20, alignItems: 'center', backgroundColor: Colors.surface, marginBottom: 12 },
  totalLabel: { color: Colors.textMuted, marginTop: 8 },
  totalAmount: { color: Colors.primary },
  sectionTitle: { color: Colors.textSecondary, marginTop: 12 },

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
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  itemNameBlock: { flex: 1, minWidth: 0, alignItems: 'flex-start', paddingRight: 8 },
  itemName: { color: Colors.text, textAlign: 'left' },
  itemQty: { color: Colors.textMuted, marginTop: 4 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  itemSubtotal: { color: Colors.text, textAlign: 'right' },
  priceInput: {
    color: Colors.text,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 72,
    textAlign: 'right',
  },

  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
    minWidth: 54,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  chipName: { color: Colors.textSecondary },
  chipNameSelected: { color: Colors.textOnPrimary, fontWeight: '700' },

  unclaimedNote: { color: Colors.danger, textAlign: 'left', marginTop: 6 },
  splitNote: { color: Colors.textMuted, textAlign: 'left', marginTop: 4 },

  extrasPanel: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: Radius.xl,
    padding: 14,
  },
  extrasLabel: { color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  amountTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  extrasInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    color: Colors.text,
  },
  flex1: { flex: 1 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { color: Colors.textSecondary },
  toggleTextActive: { color: Colors.textOnPrimary },

  addItemPanel: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addItemTitle: { color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  addItemRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addItemInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.text,
  },
  addItemInputName: { flex: 2 },
  addItemInputQty: { flex: 1 },
  addItemInputPrice: { flex: 1 },
  addItemBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  summaryName: { color: Colors.text, flex: 1 },
  summaryAmount: { color: Colors.text },

  saveBtn: { marginHorizontal: 16, marginTop: 4 },
});
