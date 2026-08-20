import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Button from '../../components/common/Button';
import { useCreateBillMutation } from '../../store/api/billsApi';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { GroupMember, TaxServiceType, ParsedReceiptData } from '../../types/models';
import { formatCurrency, formatMoneyDigits, roundMoney } from '../../utils/format';
import { useInputTextAlign } from '../../utils/rtl';
import { CheckIcon, CloseIcon, ChevronDownIcon } from '../../components/icons';

type Props = AppScreenProps<'AddBill'>;

interface LineItem {
  id: string;
  name: string;
  qty: string;
  unitPrice: string;
}

let _itemCounter = 0;
const newItemId = () => String(++_itemCounter);

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

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

function CreateBillScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const inputAlign = useInputTextAlign();
  const { groupId, groupName, prefilledData } = route.params ?? {};
  const isPreview = !!prefilledData;
  const deferGroup = !groupId;

  const [venueName, setVenueName] = useState(prefilledData?.venueName ?? '');
  const [items, setItems] = useState<LineItem[]>(() => {
    if (prefilledData?.lineItems?.length) {
      return prefilledData.lineItems.map((it) => ({
        id: newItemId(),
        name: it.name,
        qty: String(it.qty),
        unitPrice: formatMoneyDigits(it.unitPrice),
      }));
    }
    return [{ id: newItemId(), name: '', qty: '1', unitPrice: '' }];
  });
  const [taxValue, setTaxValue] = useState(prefilledData?.tax != null ? formatMoneyDigits(prefilledData.tax) : '');
  const [taxType, setTaxType] = useState<TaxServiceType>(prefilledData?.taxType ?? 'percent');
  const [deliveryValue, setDeliveryValue] = useState(prefilledData?.delivery != null ? formatMoneyDigits(prefilledData.delivery) : '');
  const [deliveryType, setDeliveryType] = useState<TaxServiceType>(prefilledData?.deliveryType ?? 'percent');
  const [vatValue, setVatValue] = useState(prefilledData?.vat != null ? formatMoneyDigits(prefilledData.vat) : '');
  const [vatType, setVatType] = useState<TaxServiceType>(prefilledData?.vatType ?? 'percent');
  const [grandTotalOverride, setGrandTotalOverride] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [payerPickerVisible, setPayerPickerVisible] = useState(false);
  const [isLumpSum, setIsLumpSum] = useState(false);
  const [lumpSumTotal, setLumpSumTotal] = useState('');

  const { data: members } = useGetGroupMembersQuery(groupId ?? '', { skip: !groupId });
  const { data: me } = useGetMeQuery();
  const [createBill, { isLoading }] = useCreateBillMutation();

  const activeMembers = (members ?? []).filter((m) => m.status === 'active' && m.userId);

  useEffect(() => {
    if (me && !paidByUserId && !deferGroup) setPaidByUserId(me.id);
  }, [me, paidByUserId, deferGroup]);

  const subtotal = roundMoney(items.reduce((sum, it) => sum + parseNum(it.qty) * parseNum(it.unitPrice), 0));
  const taxAmt = taxValue
    ? roundMoney(taxType === 'percent' ? subtotal * parseNum(taxValue) / 100 : parseNum(taxValue))
    : 0;
  const vatAmt = vatValue
    ? roundMoney(vatType === 'percent' ? (subtotal + taxAmt) * parseNum(vatValue) / 100 : parseNum(vatValue))
    : 0;
  const deliveryAmt = deliveryValue
    ? roundMoney(deliveryType === 'percent' ? (subtotal + taxAmt + vatAmt) * parseNum(deliveryValue) / 100 : parseNum(deliveryValue))
    : 0;
  const calculatedTotal = roundMoney(subtotal + taxAmt + vatAmt + deliveryAmt);
  const hasOverride = grandTotalOverride.trim().length > 0;
  const grandTotal = hasOverride ? roundMoney(parseNum(grandTotalOverride)) : calculatedTotal;
  const totalMismatch = hasOverride && Math.abs(grandTotal - calculatedTotal) > 0.01;

  const hasValidItems = items.some((it) => it.name.trim() && parseNum(it.unitPrice) > 0);
  const canContinue = isLumpSum
    ? parseNum(lumpSumTotal) > 0 && (deferGroup || !!paidByUserId)
    : hasValidItems && (deferGroup || !!paidByUserId);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: newItemId(), name: '', qty: '1', unitPrice: '' }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }, []);

  const payerName =
    activeMembers.find((m) => m.userId === paidByUserId)?.user?.displayName ??
    me?.displayName ??
    t('createBill.selectPayerFallback');

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    const goNext = (receiptData: ParsedReceiptData) => {
      const receiptJson = JSON.stringify(receiptData);
      if (deferGroup || !groupId || !groupName) {
        navigation.navigate('SelectGroupForBill', { receiptJson });
        return;
      }
      navigation.navigate('AssignItems', { groupId, groupName, receiptJson });
    };

    if (isLumpSum) {
      const amount = roundMoney(parseNum(lumpSumTotal));
      if (amount <= 0) {
        Alert.alert(t('common:error'), t('createBill.amountMustBePositive'));
        return;
      }

      if (deferGroup || !groupId || !groupName) {
        goNext({
          venueName: venueName.trim() || undefined,
          storeName: venueName.trim() || undefined,
          items: [],
          grandTotal: amount,
          captureMethod: prefilledData?.captureMethod ?? 'manual',
          sourceRef: prefilledData?.sourceRef,
        });
        return;
      }

      try {
        await createBill({
          groupId,
          amount,
          paidByUserId,
          venueName: venueName.trim() || undefined,
          captureMethod: prefilledData?.captureMethod ?? 'manual',
          sourceRef: prefilledData?.sourceRef,
        }).unwrap();
        navigation.navigate('GroupDetail', { groupId, groupName });
      } catch {
        Alert.alert(t('common:error'), t('createBill.saveFailed'));
      }
      return;
    }

    const validItems = items.filter((it) => it.name.trim() && parseNum(it.unitPrice) > 0);

    goNext({
      storeName: venueName.trim() || undefined,
      venueName: venueName.trim() || undefined,
      items: validItems.map((it) => ({
        id: it.id,
        name: it.name.trim(),
        price: roundMoney(parseNum(it.unitPrice)),
        qty: Math.max(1, Math.floor(parseNum(it.qty))),
      })),
      tax: taxValue ? roundMoney(parseNum(taxValue)) : undefined,
      taxType: taxValue ? taxType : undefined,
      delivery: deliveryValue ? roundMoney(parseNum(deliveryValue)) : undefined,
      deliveryType: deliveryValue ? deliveryType : undefined,
      vat: vatValue ? roundMoney(parseNum(vatValue)) : undefined,
      vatType: vatValue ? vatType : undefined,
      grandTotal: hasOverride ? grandTotal : undefined,
      captureMethod: prefilledData?.captureMethod ?? 'manual',
      sourceRef: prefilledData?.sourceRef,
    });
  }, [
    canContinue, isLumpSum, lumpSumTotal, items, venueName, taxValue, taxType,
    deliveryValue, deliveryType, vatValue, vatType, hasOverride, grandTotal,
    paidByUserId, groupId, groupName, deferGroup, prefilledData, createBill, navigation, t,
  ]);

  const renderPayerRow = useCallback(
    ({ item }: { item: GroupMember }) => {
      const name = item.user?.displayName ?? item.pendingPhone ?? t('createBill.defaultMemberName');
      const isSelected = item.userId === paidByUserId;
      return (
        <TouchableOpacity
          style={[styles.payerRow, isSelected && styles.payerRowSelected]}
          onPress={() => { setPaidByUserId(item.userId!); setPayerPickerVisible(false); }}>
          <Text style={[typography.bodyLarge, styles.payerRowName, isSelected && styles.payerRowNameSelected]}>{name}</Text>
          {isSelected && (
            <View style={styles.checkmark}>
              <CheckIcon size={16} color={Colors.primary} strokeWidth={2} />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [paidByUserId, typography],
  );

  return (
    <SafeScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {isPreview && (
          <View style={styles.previewBanner}>
            <Text style={[typography.labelMedium, styles.previewBannerText]}>
              {prefilledData?.captureMethod === 'qr' ? t('createBill.qrPreviewBanner') : t('createBill.ocrPreviewBanner')}
            </Text>
          </View>
        )}

        {/* Venue */}
        <Text style={[typography.labelMedium, styles.sectionLabel]}>{t('createBill.venueLabel')}</Text>
        <TextInput
          style={[typography.bodyLarge, styles.input]}
          value={venueName}
          onChangeText={setVenueName}
          placeholder={t('createBill.venuePlaceholder')}
          placeholderTextColor={Colors.textMuted}
          textAlign={inputAlign}
          maxLength={100}
        />

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, !isLumpSum && styles.modeBtnActive]}
            onPress={() => setIsLumpSum(false)}>
            <Text style={[typography.labelMedium, styles.modeBtnText, !isLumpSum && styles.modeBtnTextActive]}>{t('createBill.itemizedModeLabel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, isLumpSum && styles.modeBtnActive]}
            onPress={() => setIsLumpSum(true)}>
            <Text style={[typography.labelMedium, styles.modeBtnText, isLumpSum && styles.modeBtnTextActive]}>{t('createBill.lumpSumModeLabel')}</Text>
          </TouchableOpacity>
        </View>

        {isLumpSum ? (
          <>
            <Text style={[typography.labelMedium, styles.sectionLabel]}>{t('createBill.lumpSumAmountLabel')}</Text>
            <TextInput
              style={[typography.bodyLarge, styles.input]}
              value={lumpSumTotal}
              onChangeText={setLumpSumTotal}
              placeholder={t('createBill.amountPlaceholderZero')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              textAlign={inputAlign}
            />
            <Text style={[typography.caption, styles.lumpSumNote]}>{t('createBill.lumpSumNote')}</Text>
          </>
        ) : (
          <>
            {/* Items */}
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={[typography.labelMedium, styles.itemIndex]}>{index + 1}</Text>
                <TextInput
                  style={[typography.bodyLarge, styles.itemNameInput]}
                  value={item.name}
                  onChangeText={(v) => updateItem(item.id, 'name', v)}
                  placeholder={t('createBill.itemNamePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  textAlign={inputAlign}
                  maxLength={100}
                />
                <TextInput
                  style={[typography.bodyLarge, styles.itemPriceInput]}
                  value={item.unitPrice}
                  onChangeText={(v) => updateItem(item.id, 'unitPrice', v)}
                  placeholder={t('createBill.pricePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  textAlign={inputAlign}
                />
                <Text style={styles.multiplySign}>×</Text>
                <View style={styles.qtyChip}>
                  <TextInput
                    style={[typography.labelMedium, styles.itemQtyInput]}
                    value={item.qty}
                    onChangeText={(v) => updateItem(item.id, 'qty', v.replace(/[^0-9]/g, ''))}
                    placeholder={t('createBill.qtyPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                </View>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeItemBtn}>
                    <CloseIcon size={14} color={Colors.danger} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={addItem} style={styles.addItemBtn} activeOpacity={0.75}>
              <Text style={[typography.labelMedium, styles.addItemBtnText]}>{t('createBill.addItemButton')}</Text>
            </TouchableOpacity>

            {/* Subtotal */}
            <View style={styles.subtotalRow}>
              <Text style={[typography.labelLarge, styles.subtotalAmt]}>{formatCurrency(subtotal)}</Text>
              <Text style={[typography.labelMedium, styles.subtotalLabel]}>{t('createBill.subtotalLabel')}</Text>
            </View>

            {/* Tax */}
            <Text style={[typography.labelMedium, styles.sectionLabel]}>{t('createBill.taxLabel')}</Text>
            <View style={styles.amountTypeRow}>
              <TextInput
                style={[typography.bodyLarge, styles.input, styles.flex1]}
                value={taxValue}
                onChangeText={setTaxValue}
                placeholder={taxType === 'percent' ? t('createBill.taxPlaceholderPercent') : t('createBill.taxPlaceholderAmount')}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                textAlign={inputAlign}
              />
              <AmountTypeToggle value={taxType} onChange={setTaxType} />
            </View>

            {/* VAT */}
            <Text style={[typography.labelMedium, styles.sectionLabel]}>{t('createBill.vatLabel')}</Text>
            <View style={styles.amountTypeRow}>
              <TextInput
                style={[typography.bodyLarge, styles.input, styles.flex1]}
                value={vatValue}
                onChangeText={setVatValue}
                placeholder={vatType === 'percent' ? t('createBill.vatPlaceholderPercent') : t('createBill.vatPlaceholderAmount')}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                textAlign={inputAlign}
              />
              <AmountTypeToggle value={vatType} onChange={setVatType} />
            </View>

            {/* Delivery */}
            <Text style={[typography.labelMedium, styles.sectionLabel]}>{t('createBill.deliveryLabel')}</Text>
            <View style={styles.amountTypeRow}>
              <TextInput
                style={[typography.bodyLarge, styles.input, styles.flex1]}
                value={deliveryValue}
                onChangeText={setDeliveryValue}
                placeholder={deliveryType === 'percent' ? t('createBill.deliveryPlaceholderPercent') : t('createBill.deliveryPlaceholderAmount')}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                textAlign={inputAlign}
              />
              <AmountTypeToggle value={deliveryType} onChange={setDeliveryType} />
            </View>

            {/* Grand total */}
            <View style={styles.grandTotalBox}>
              <Text style={[typography.amountMedium, styles.grandTotalAmt]}>{formatCurrency(calculatedTotal)}</Text>
              <Text style={[typography.labelMedium, styles.grandTotalLabel]}>{t('createBill.grandTotalLabel')}</Text>
            </View>

            {/* Override */}
            <Text style={[typography.labelMedium, styles.sectionLabel]}>{t('createBill.overrideLabel')}</Text>
            <TextInput
              style={[typography.bodyLarge, styles.input]}
              value={grandTotalOverride}
              onChangeText={setGrandTotalOverride}
              placeholder={t('createBill.overridePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              textAlign={inputAlign}
            />
            {totalMismatch && (
              <Text style={[typography.caption, styles.mismatchWarning]}>
                {t('createBill.mismatchWarning')}
              </Text>
            )}
          </>
        )}

        {/* Payer — only when bill already belongs to a group */}
        {!deferGroup && (
          <>
            <Text style={[typography.labelMedium, styles.sectionLabel]}>{t('createBill.payerLabel')}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setPayerPickerVisible(true)}>
              <ChevronDownIcon size={14} color={Colors.textMuted} strokeWidth={2} />
              <Text style={[typography.bodyLarge, styles.pickerText]}>{payerName}</Text>
            </TouchableOpacity>
          </>
        )}

        <Button
          title={deferGroup ? t('createBill.continueChooseGroup') : t('common:continue')}
          onPress={handleContinue}
          loading={isLoading}
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          disabled={!canContinue}
        />
      </ScrollView>

      <Modal
        visible={payerPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayerPickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPayerPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={[typography.headingSmall, styles.modalTitle]}>{t('createBill.payerModalTitle')}</Text>
            <FlatList
              data={activeMembers}
              keyExtractor={(m) => m.id}
              renderItem={renderPayerRow}
              scrollEnabled={activeMembers.length > 6}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeScreen>
  );
}

export default memo(CreateBillScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48 },

  previewBanner: {
    backgroundColor: Colors.tint,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  previewBannerText: { color: Colors.primary, textAlign: 'right' },

  sectionLabel: { color: Colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    color: Colors.text,
    marginBottom: 12,
  },
  flex1: { flex: 1, marginBottom: 0 },

  // Figma: a segmented pill — light track, active segment is a floating white
  // chip with a soft shadow and teal text (not a solid teal fill).
  modeRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: Colors.neutral200,
    borderRadius: Radius.pill,
    padding: 3,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.pill, alignItems: 'center' },
  modeBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  modeBtnText: { color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.primary },

  lumpSumNote: { color: Colors.textMuted, textAlign: 'right', marginBottom: 8 },

  // Figma: full-width outlined pill below the item list (not a small chip next
  // to an "Items" label — that header doesn't exist in the design).
  addItemBtn: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  addItemBtnText: { color: Colors.primary },

  // Figma: each item is a single row (index · name · price × qty · remove),
  // not a two-row stacked card.
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  itemIndex: { color: Colors.textMuted, minWidth: 22, textAlign: 'center' },
  itemNameInput: { flex: 1, color: Colors.text, padding: 0 },
  itemPriceInput: {
    minWidth: 72,
    color: Colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.neutral100,
  },
  multiplySign: { fontSize: 14, color: Colors.textMuted, fontWeight: '700' },
  qtyChip: {
    minWidth: 36,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.neutral100,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemQtyInput: { color: Colors.text, padding: 0, minWidth: 24, textAlign: 'center' },
  removeItemBtn: { padding: 4 },

  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  subtotalLabel: { color: Colors.textSecondary },
  subtotalAmt: { color: Colors.text },

  amountTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { color: Colors.textSecondary },
  toggleTextActive: { color: Colors.textOnPrimary },

  grandTotalBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  grandTotalLabel: { color: Colors.text },
  grandTotalAmt: { color: Colors.text },

  mismatchWarning: { color: Colors.warning, textAlign: 'right', marginBottom: 8 },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  pickerText: { flex: 1, color: Colors.text, textAlign: 'right' },

  continueBtn: { marginTop: 4 },
  continueBtnDisabled: { opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalTitle: {
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  payerRowSelected: { backgroundColor: Colors.tint },
  payerRowName: { flex: 1, color: Colors.text, textAlign: 'right' },
  payerRowNameSelected: { color: Colors.primary },
  checkmark: { marginLeft: 8 },
});
