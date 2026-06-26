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
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Button from '../../components/common/Button';
import { useCreateBillMutation } from '../../store/api/billsApi';
import { useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { GroupMember, TaxServiceType, ParsedReceiptData } from '../../types/models';

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
  return (
    <View style={styles.toggle}>
      <TouchableOpacity
        style={[styles.toggleBtn, value === 'percent' && styles.toggleBtnActive]}
        onPress={() => onChange('percent')}>
        <Text style={[styles.toggleText, value === 'percent' && styles.toggleTextActive]}>%</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleBtn, value === 'amount' && styles.toggleBtnActive]}
        onPress={() => onChange('amount')}>
        <Text style={[styles.toggleText, value === 'amount' && styles.toggleTextActive]}>ج.م</Text>
      </TouchableOpacity>
    </View>
  );
}

function CreateBillScreen({ route, navigation }: Props) {
  const { groupId, groupName, prefilledData } = route.params;
  const isPreview = !!prefilledData;

  const [venueName, setVenueName] = useState(prefilledData?.venueName ?? '');
  const [items, setItems] = useState<LineItem[]>(() => {
    if (prefilledData?.lineItems?.length) {
      return prefilledData.lineItems.map((it) => ({
        id: newItemId(),
        name: it.name,
        qty: String(it.qty),
        unitPrice: String(it.unitPrice),
      }));
    }
    return [{ id: newItemId(), name: '', qty: '1', unitPrice: '' }];
  });
  const [taxValue, setTaxValue] = useState(prefilledData?.tax != null ? String(prefilledData.tax) : '');
  const [taxType, setTaxType] = useState<TaxServiceType>(prefilledData?.taxType ?? 'percent');
  const [serviceValue, setServiceValue] = useState(prefilledData?.service != null ? String(prefilledData.service) : '');
  const [serviceType, setServiceType] = useState<TaxServiceType>(prefilledData?.serviceType ?? 'percent');
  const [tipValue, setTipValue] = useState('');
  const [tipType, setTipType] = useState<TaxServiceType>('percent');
  const [grandTotalOverride, setGrandTotalOverride] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [payerPickerVisible, setPayerPickerVisible] = useState(false);
  const [isLumpSum, setIsLumpSum] = useState(false);
  const [lumpSumTotal, setLumpSumTotal] = useState('');

  const { data: members } = useGetGroupMembersQuery(groupId);
  const { data: me } = useGetMeQuery();
  const [createBill, { isLoading }] = useCreateBillMutation();

  const activeMembers = (members ?? []).filter((m) => m.status === 'active' && m.userId);

  useEffect(() => {
    if (me && !paidByUserId) setPaidByUserId(me.id);
  }, [me, paidByUserId]);

  const subtotal = items.reduce((sum, it) => sum + parseNum(it.qty) * parseNum(it.unitPrice), 0);
  const taxAmt = taxValue
    ? taxType === 'percent' ? subtotal * parseNum(taxValue) / 100 : parseNum(taxValue)
    : 0;
  const serviceAmt = serviceValue
    ? serviceType === 'percent' ? subtotal * parseNum(serviceValue) / 100 : parseNum(serviceValue)
    : 0;
  const tipAmt = tipValue
    ? tipType === 'percent' ? (subtotal + taxAmt + serviceAmt) * parseNum(tipValue) / 100 : parseNum(tipValue)
    : 0;
  const calculatedTotal = subtotal + taxAmt + serviceAmt + tipAmt;
  const hasOverride = grandTotalOverride.trim().length > 0;
  const grandTotal = hasOverride ? parseNum(grandTotalOverride) : calculatedTotal;
  const totalMismatch = hasOverride && Math.abs(grandTotal - calculatedTotal) > 0.01;

  const hasValidItems = items.some((it) => it.name.trim() && parseNum(it.unitPrice) > 0);
  const canContinue = isLumpSum
    ? parseNum(lumpSumTotal) > 0 && !!paidByUserId
    : hasValidItems && !!paidByUserId;

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
    'اختر من دفع';

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    if (isLumpSum) {
      const amount = parseNum(lumpSumTotal);
      if (amount <= 0) {
        Alert.alert('خطأ', 'يجب أن يكون المبلغ أكبر من صفر.');
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
        Alert.alert('خطأ', 'تعذر حفظ الفاتورة، حاول مرة أخرى لاحقاً.');
      }
      return;
    }

    const validItems = items.filter((it) => it.name.trim() && parseNum(it.unitPrice) > 0);

    const receiptData: ParsedReceiptData = {
      storeName: venueName.trim() || undefined,
      venueName: venueName.trim() || undefined,
      items: validItems.map((it) => ({
        id: it.id,
        name: it.name.trim(),
        price: parseNum(it.unitPrice),
        qty: Math.max(1, Math.floor(parseNum(it.qty))),
      })),
      tax: taxValue ? parseNum(taxValue) : undefined,
      taxType: taxValue ? taxType : undefined,
      service: serviceValue ? parseNum(serviceValue) : undefined,
      serviceType: serviceValue ? serviceType : undefined,
      tip: tipValue ? parseNum(tipValue) : undefined,
      tipType: tipValue ? tipType : undefined,
      grandTotal: hasOverride ? grandTotal : undefined,
      captureMethod: prefilledData?.captureMethod ?? 'manual',
      sourceRef: prefilledData?.sourceRef,
    };

    navigation.navigate('ReceiptSplit', {
      groupId,
      groupName,
      receiptJson: JSON.stringify(receiptData),
    });
  }, [
    canContinue, isLumpSum, lumpSumTotal, items, venueName, taxValue, taxType,
    serviceValue, serviceType, tipValue, tipType, hasOverride, grandTotal,
    paidByUserId, groupId, groupName, prefilledData, createBill, navigation,
  ]);

  const renderPayerRow = useCallback(
    ({ item }: { item: GroupMember }) => {
      const name = item.user?.displayName ?? item.pendingPhone ?? 'مستخدم';
      const isSelected = item.userId === paidByUserId;
      return (
        <TouchableOpacity
          style={[styles.payerRow, isSelected && styles.payerRowSelected]}
          onPress={() => { setPaidByUserId(item.userId!); setPayerPickerVisible(false); }}>
          <Text style={[styles.payerRowName, isSelected && styles.payerRowNameSelected]}>{name}</Text>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      );
    },
    [paidByUserId],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {isPreview && (
          <View style={styles.previewBanner}>
            <Text style={styles.previewBannerText}>
              {prefilledData?.captureMethod === 'qr' ? '📷 تم مسح QR — راجع التفاصيل وعدّل إن لزم' : '🖨 نتيجة OCR — راجع وعدّل أي حقل'}
            </Text>
          </View>
        )}

        {/* Venue */}
        <Text style={styles.sectionLabel}>المطعم / المحل</Text>
        <TextInput
          style={styles.input}
          value={venueName}
          onChangeText={setVenueName}
          placeholder="مثال: زوبا الزمالك (اختياري)"
          placeholderTextColor={Colors.textMuted}
          textAlign="right"
          maxLength={100}
        />

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, !isLumpSum && styles.modeBtnActive]}
            onPress={() => setIsLumpSum(false)}>
            <Text style={[styles.modeBtnText, !isLumpSum && styles.modeBtnTextActive]}>أصناف مفصّلة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, isLumpSum && styles.modeBtnActive]}
            onPress={() => setIsLumpSum(true)}>
            <Text style={[styles.modeBtnText, isLumpSum && styles.modeBtnTextActive]}>إجمالي فقط</Text>
          </TouchableOpacity>
        </View>

        {isLumpSum ? (
          <>
            <Text style={styles.sectionLabel}>المبلغ الإجمالي (ج.م) *</Text>
            <TextInput
              style={styles.input}
              value={lumpSumTotal}
              onChangeText={setLumpSumTotal}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              textAlign="right"
            />
            <Text style={styles.lumpSumNote}>في وضع الإجمالي فقط، لن يتوفر التوزيع بالصنف.</Text>
          </>
        ) : (
          <>
            {/* Items */}
            <View style={styles.sectionHeader}>
              <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
                <Text style={styles.addItemBtnText}>+ صنف جديد</Text>
              </TouchableOpacity>
              <Text style={styles.sectionLabel}>الأصناف *</Text>
            </View>

            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemFields}>
                  <View style={styles.itemNameRow}>
                    <Text style={styles.itemIndex}>{index + 1}</Text>
                    <TextInput
                      style={[styles.input, styles.itemNameInput]}
                      value={item.name}
                      onChangeText={(v) => updateItem(item.id, 'name', v)}
                      placeholder="اسم الصنف"
                      placeholderTextColor={Colors.textMuted}
                      textAlign="right"
                      maxLength={100}
                    />
                  </View>
                  <View style={styles.itemPriceRow}>
                    <TextInput
                      style={[styles.input, styles.itemPriceInput]}
                      value={item.unitPrice}
                      onChangeText={(v) => updateItem(item.id, 'unitPrice', v)}
                      placeholder="السعر"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="decimal-pad"
                      textAlign="right"
                    />
                    <Text style={styles.multiplySign}>×</Text>
                    <TextInput
                      style={[styles.input, styles.itemQtyInput]}
                      value={item.qty}
                      onChangeText={(v) => updateItem(item.id, 'qty', v.replace(/[^0-9]/g, ''))}
                      placeholder="الكمية"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      textAlign="center"
                    />
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeItemBtn}>
                        <Text style={styles.removeItemText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {/* Subtotal */}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalAmt}>{subtotal.toFixed(2)} ج.م</Text>
              <Text style={styles.subtotalLabel}>المجموع الفرعي</Text>
            </View>

            {/* Tax */}
            <Text style={styles.sectionLabel}>الضريبة (اختياري)</Text>
            <View style={styles.amountTypeRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                value={taxValue}
                onChangeText={setTaxValue}
                placeholder={taxType === 'percent' ? 'مثال: 14' : 'مثال: 25.00'}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <AmountTypeToggle value={taxType} onChange={setTaxType} />
            </View>

            {/* Service */}
            <Text style={styles.sectionLabel}>رسوم الخدمة (اختياري)</Text>
            <View style={styles.amountTypeRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                value={serviceValue}
                onChangeText={setServiceValue}
                placeholder={serviceType === 'percent' ? 'مثال: 12' : 'مثال: 20.00'}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <AmountTypeToggle value={serviceType} onChange={setServiceType} />
            </View>

            {/* Tip */}
            <Text style={styles.sectionLabel}>الإكرامية (اختياري)</Text>
            <View style={styles.amountTypeRow}>
              <TextInput
                style={[styles.input, styles.flex1]}
                value={tipValue}
                onChangeText={setTipValue}
                placeholder={tipType === 'percent' ? 'مثال: 10' : 'مثال: 15.00'}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <AmountTypeToggle value={tipType} onChange={setTipType} />
            </View>

            {/* Grand total */}
            <View style={styles.grandTotalBox}>
              <Text style={styles.grandTotalAmt}>{calculatedTotal.toFixed(2)} ج.م</Text>
              <Text style={styles.grandTotalLabel}>الإجمالي</Text>
            </View>

            {/* Override */}
            <Text style={styles.sectionLabel}>تجاوز الإجمالي (اختياري)</Text>
            <TextInput
              style={styles.input}
              value={grandTotalOverride}
              onChangeText={setGrandTotalOverride}
              placeholder="اتركه فارغاً لاستخدام الإجمالي المحسوب"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              textAlign="right"
            />
            {totalMismatch && (
              <Text style={styles.mismatchWarning}>
                ⚠ الإجمالي المدخل لا يتطابق مع الحسابات — سيُستخدم رقمك.
              </Text>
            )}
          </>
        )}

        {/* Payer */}
        <Text style={styles.sectionLabel}>من دفع؟ *</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setPayerPickerVisible(true)}>
          <Text style={styles.pickerArrow}>▼</Text>
          <Text style={styles.pickerText}>{payerName}</Text>
        </TouchableOpacity>

        <Button
          title="متابعة"
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
            <Text style={styles.modalTitle}>من دفع؟</Text>
            <FlatList
              data={activeMembers}
              keyExtractor={(m) => m.id}
              renderItem={renderPayerRow}
              scrollEnabled={activeMembers.length > 6}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(CreateBillScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 48 },

  previewBanner: {
    backgroundColor: Colors.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  previewBannerText: { color: Colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'right' },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textAlign: 'right',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  flex1: { flex: 1, marginBottom: 0 },

  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.textOnPrimary },

  lumpSumNote: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 8 },

  addItemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  addItemBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  itemRow: { marginBottom: 6 },
  itemFields: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemIndex: { fontSize: 13, color: Colors.textMuted, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  itemNameInput: { flex: 1, marginBottom: 0 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemPriceInput: { flex: 2, marginBottom: 0 },
  itemQtyInput: { flex: 1, marginBottom: 0 },
  multiplySign: { fontSize: 16, color: Colors.textMuted, fontWeight: '700' },
  removeItemBtn: { padding: 6 },
  removeItemText: { fontSize: 14, color: Colors.danger },

  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  subtotalLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  subtotalAmt: { fontSize: 15, fontWeight: '700', color: Colors.text },

  amountTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  toggleTextActive: { color: Colors.textOnPrimary },

  grandTotalBox: {
    backgroundColor: Colors.primary + '12',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  grandTotalLabel: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  grandTotalAmt: { fontSize: 22, fontWeight: '800', color: Colors.primary },

  mismatchWarning: { fontSize: 12, color: Colors.warning, textAlign: 'right', marginBottom: 8 },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  pickerText: { flex: 1, fontSize: 15, color: Colors.text, textAlign: 'right' },
  pickerArrow: { fontSize: 12, color: Colors.textMuted },

  continueBtn: { marginTop: 4 },
  continueBtnDisabled: { opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
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
  payerRowSelected: { backgroundColor: Colors.primary + '10' },
  payerRowName: { flex: 1, fontSize: 16, color: Colors.text, textAlign: 'right' },
  payerRowNameSelected: { color: Colors.primary, fontWeight: '600' },
  checkmark: { fontSize: 18, color: Colors.primary, marginLeft: 8 },
});
