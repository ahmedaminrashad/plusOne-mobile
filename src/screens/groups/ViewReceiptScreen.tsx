import React, { useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import { useGetGroupBillsQuery } from '../../store/api/billsApi';
import { BillLineItem, CaptureMethod } from '../../types/models';

type Props = AppScreenProps<'ViewReceipt'>;

const CAPTURE_METHOD_LABEL: Record<CaptureMethod, string> = {
  qr: 'مسح QR',
  ocr: 'مسح إيصال',
  manual: 'إدخال يدوي',
};

function LineItemRow({ item }: { item: BillLineItem }) {
  const subtotal = item.qty * item.unitPrice;
  return (
    <View style={styles.itemRow}>
      <Text style={styles.itemSubtotal}>{subtotal.toFixed(2)}</Text>
      <View style={styles.itemNameBlock}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.qty > 1 && (
          <Text style={styles.itemQty}>{item.qty} × {item.unitPrice.toFixed(2)}</Text>
        )}
      </View>
    </View>
  );
}

function ViewReceiptScreen({ route }: Props) {
  const { groupId, billId } = route.params;
  const { data: bills, isLoading } = useGetGroupBillsQuery(groupId);
  const bill = useMemo(() => bills?.find((b) => b.id === billId), [bills, billId]);

  const subtotal = useMemo(
    () => (bill?.lineItems ?? []).reduce((sum, it) => sum + it.qty * it.unitPrice, 0),
    [bill?.lineItems],
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!bill) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyText}>تعذر العثور على الإيصال</Text>
        </View>
      </SafeAreaView>
    );
  }

  const payerName = bill.paidBy?.displayName ?? 'مستخدم';
  const date = new Date(bill.createdAt).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const displayName = bill.venueName ?? bill.title ?? 'فاتورة';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {bill.receiptPhotoUrl ? (
          <View style={styles.photoWrap}>
            <Image
              source={{ uri: bill.receiptPhotoUrl }}
              style={styles.photo}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.placeholderHeader}>
            <Text style={styles.placeholderIcon}>🧾</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.venueName}>{displayName}</Text>
          <Text style={styles.totalAmount}>{Number(bill.amount).toFixed(2)} {bill.currency}</Text>

          <View style={styles.payerRow}>
            <Avatar uri={bill.paidBy?.photoUrl} name={payerName} size={28} />
            <Text style={styles.payerText}>دفع {payerName} • {date}</Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{CAPTURE_METHOD_LABEL[bill.captureMethod]}</Text>
            </View>
          </View>
        </View>

        {bill.lineItems && bill.lineItems.length > 0 && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>الأصناف</Text>
            {bill.lineItems.map((item, idx) => (
              <LineItemRow key={idx} item={item} />
            ))}
          </View>
        )}

        {(taxAmt > 0 || serviceAmt > 0 || tipAmt > 0) && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>التفاصيل</Text>
            {bill.lineItems && bill.lineItems.length > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{subtotal.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>المجموع الفرعي</Text>
              </View>
            )}
            {taxAmt > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{taxAmt.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>ضريبة</Text>
              </View>
            )}
            {serviceAmt > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{serviceAmt.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>خدمة</Text>
              </View>
            )}
            {tipAmt > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{tipAmt.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>إكرامية</Text>
              </View>
            )}
          </View>
        )}

        {bill.notes && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>ملاحظات</Text>
            <Text style={styles.notesText}>{bill.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(ViewReceiptScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },

  photoWrap: { backgroundColor: '#000', height: 260 },
  photo: { width: '100%', height: '100%' },
  placeholderHeader: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  placeholderIcon: { fontSize: 48 },

  summaryCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  venueName: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: Colors.primary, marginBottom: 10 },
  payerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  payerText: { fontSize: 13, color: Colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },

  itemsCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textAlign: 'right', marginBottom: 10 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemNameBlock: { flex: 1, alignItems: 'flex-end' },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text, textAlign: 'right' },
  itemQty: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemSubtotal: { fontSize: 15, fontWeight: '700', color: Colors.text, marginLeft: 8 },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: Colors.text },

  notesText: { fontSize: 14, color: Colors.text, textAlign: 'right', lineHeight: 20 },
});
