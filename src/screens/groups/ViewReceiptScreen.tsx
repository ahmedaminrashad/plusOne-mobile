import React, { useMemo, memo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useGetBillDetailQuery, useCloseBillMutation } from '../../store/api/billsApi';
import {
  usePayShareMutation,
  useCancelShareInitiationMutation,
} from '../../store/api/sharesApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { BillLineItem, CaptureMethod } from '../../types/models';
import { formatCurrency, formatDate, resolveAssetUrl } from '../../utils/format';
import { normalizeInstaPayIdentifier, buildInstaPayLink } from '../../utils/instapay';

async function tryOpenInstaPay(url: string): Promise<boolean> {
  console.log('[InstaPay] opening deep link:', url);
  try {
    await Linking.openURL(url);
    return true;
  } catch (err) {
    console.log('[InstaPay] failed to open deep link:', url, err);
    return false;
  }
}

type Props = AppScreenProps<'ViewReceipt'>;

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

function ViewReceiptScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const { groupId, groupName, billId } = route.params;
  const { data: bill, isLoading, refetch: refetchBill } = useGetBillDetailQuery(billId);
  const [closeBill, { isLoading: isClosing }] = useCloseBillMutation();

  // The payer's InstaPay ID can change on another device after this bill was first
  // cached here — refetch on every focus so `bill.paidBy.instaPayAlias` stays current
  // before the payer taps "Pay".
  useFocusEffect(
    useCallback(() => {
      refetchBill();
    }, [refetchBill]),
  );

  const captureMethodLabel: Record<CaptureMethod, string> = {
    qr: t('viewReceipt.captureMethodQr'),
    ocr: t('viewReceipt.captureMethodOcr'),
    manual: t('viewReceipt.captureMethodManual'),
  };

  const { data: me } = useGetMeQuery();
  const shares = bill?.shares;
  const [payShare, { isLoading: isPaying }] = usePayShareMutation();
  const [cancelInitiation] = useCancelShareInitiationMutation();

  const myShare = useMemo(
    () => shares?.find((s) => s.ownerUserId === me?.id),
    [shares, me?.id],
  );
  const isPayer = !!me && !!bill && bill.paidByUserId === me.id;

  const handleEditItems = useCallback(() => {
    navigation.navigate('EditBillItems', { groupId, groupName, billId });
  }, [navigation, groupId, groupName, billId]);

  const handleCloseSplit = useCallback(() => {
    Alert.alert(
      t('viewReceipt.closeSplitConfirmTitle'),
      t('viewReceipt.closeSplitConfirmMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('viewReceipt.closeSplitButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await closeBill(billId).unwrap();
            } catch {
              Alert.alert(t('common:error'), t('viewReceipt.closeSplitFailed'));
            }
          },
        },
      ],
    );
  }, [closeBill, billId, t]);

  // Set right after a successful deep-link handoff; consumed on the next app-resume
  // to ask "did you complete the payment?" per the InstaPay handoff flow.
  const awaitingReturnRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active' || !awaitingReturnRef.current) return;
      awaitingReturnRef.current = false;
      if (!myShare || myShare.status !== 'initiated') return;

      Alert.alert(
        t('viewReceipt.paymentConfirmTitle'),
        t('viewReceipt.paymentConfirmMessage', { amount: formatCurrency(myShare.amountPiastres / 100, myShare.currency) }),
        [
          {
            text: t('viewReceipt.noCancelButton'),
            style: 'cancel',
            onPress: async () => {
              try {
                await cancelInitiation(myShare.id).unwrap();
              } catch {
                // share may have already been confirmed/failed by the initiator in the meantime — nothing to do
              }
            },
          },
          { text: t('viewReceipt.yesPaidButton') },
        ],
      );
    });
    return () => subscription.remove();
  }, [myShare, cancelInitiation]);

  const showManualCopyFallback = useCallback(
    (alias: string, amountText: string, currency: string, shareId: string) => {
      Alert.alert(
        t('viewReceipt.instaPayTitle'),
        t('viewReceipt.manualPayInstructions', { amount: formatCurrency(Number(amountText), currency), alias }),
        [
          { text: t('common:cancel'), style: 'cancel' },
          {
            text: t('viewReceipt.paidButton'),
            onPress: async () => {
              try {
                await payShare(shareId).unwrap();
              } catch {
                Alert.alert(t('common:error'), t('viewReceipt.markPaidFailed'));
              }
            },
          },
        ],
      );
    },
    [payShare, t],
  );

  const openInstaPayAndInitiate = useCallback(
    async (alias: string, amountText: string, currency: string, shareId: string) => {
      const link = buildInstaPayLink(alias);
      const opened = await tryOpenInstaPay(link);
      if (!opened) {
        showManualCopyFallback(alias, amountText, currency, shareId);
        return;
      }

      awaitingReturnRef.current = true;
      try {
        await payShare(shareId).unwrap();
      } catch {
        // Idempotency conflicts (already initiated) are expected here and reconciled on app resume
      }
    },
    [payShare, showManualCopyFallback],
  );

  const handlePay = useCallback(() => {
    if (!myShare || !bill) return;
    const rawAlias = bill.paidBy?.instaPayAlias;
    if (!rawAlias) {
      Alert.alert(t('viewReceipt.noAliasTitle'), t('viewReceipt.noAliasMessage', { name: bill.paidBy?.displayName ?? t('viewReceipt.creatorFallback') }));
      return;
    }
    const alias = normalizeInstaPayIdentifier(rawAlias);

    const amountText = (myShare.amountPiastres / 100).toFixed(2);
    const shareId = myShare.id;
    const currency = myShare.currency;

    // The InstaPay link only carries the recipient — the amount isn't pre-filled,
    // so show it upfront before routing the payer into the app.
    Alert.alert(
      t('viewReceipt.instaPayTitle'),
      t('viewReceipt.payInstructions', { alias, amount: formatCurrency(Number(amountText), currency) }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:continue'),
          onPress: () => openInstaPayAndInitiate(alias, amountText, currency, shareId),
        },
      ],
    );
  }, [myShare, bill, openInstaPayAndInitiate, t]);

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
          <Text style={styles.emptyText}>{t('viewReceipt.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const payerName = bill.paidBy?.displayName ?? t('viewReceipt.defaultUserName');
  const date = formatDate(bill.createdAt);
  const displayName = bill.venueName ?? bill.title ?? t('viewReceipt.defaultBillName');

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
          <Text style={styles.totalAmount}>{formatCurrency(Number(bill.amount), bill.currency)}</Text>

          <View style={styles.payerRow}>
            <Avatar uri={resolveAssetUrl(bill.paidBy?.photoUrl)} name={payerName} size={28} />
            <Text style={styles.payerText}>{t('viewReceipt.paidByAndDate', { payerName, date })}</Text>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{captureMethodLabel[bill.captureMethod]}</Text>
            </View>
            {!bill.isEditable && (
              <View style={[styles.badge, styles.closedBadge]}>
                <Text style={[styles.badgeText, styles.closedBadgeText]}>{t('viewReceipt.closedBadge')}</Text>
              </View>
            )}
          </View>
        </View>

        {bill.isEditable && (
          <View style={styles.actionsRow}>
            <Button
              title={bill.lineItems && bill.lineItems.length > 0 ? t('viewReceipt.editItemsButton') : t('viewReceipt.addItemsButton')}
              onPress={handleEditItems}
              style={styles.actionButton}
              variant="outline"
            />
            {isPayer && (
              <Button
                title={t('viewReceipt.closeSplitButton')}
                onPress={handleCloseSplit}
                loading={isClosing}
                style={styles.actionButton}
                variant="outline"
              />
            )}
          </View>
        )}

        {!isPayer && myShare && (
          <View style={styles.payCard}>
            {myShare.status === 'settled' ? (
              <Text style={styles.paySettledText}>{t('viewReceipt.shareSettled')}</Text>
            ) : myShare.status === 'initiated' ? (
              <Text style={styles.payPendingText}>
                {t('viewReceipt.awaitingConfirmation', { payerName, amount: formatCurrency(myShare.amountPiastres / 100, myShare.currency) })}
              </Text>
            ) : (
              <>
                <Text style={styles.payLabel}>{t('viewReceipt.yourShareLabel')}</Text>
                <Text style={styles.payAmount}>
                  {formatCurrency(myShare.amountPiastres / 100, myShare.currency)}
                </Text>
                <Button title={t('viewReceipt.payButton')} onPress={handlePay} loading={isPaying} style={styles.payButton} />
              </>
            )}
          </View>
        )}

        {bill.lineItems && bill.lineItems.length > 0 && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>{t('viewReceipt.itemsTitle')}</Text>
            {bill.lineItems.map((item, idx) => (
              <LineItemRow key={idx} item={item} />
            ))}
          </View>
        )}

        {(taxAmt > 0 || serviceAmt > 0 || tipAmt > 0) && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>{t('viewReceipt.detailsTitle')}</Text>
            {bill.lineItems && bill.lineItems.length > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{subtotal.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>{t('viewReceipt.subtotalLabel')}</Text>
              </View>
            )}
            {taxAmt > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{taxAmt.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>{t('viewReceipt.taxLabel')}</Text>
              </View>
            )}
            {serviceAmt > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{serviceAmt.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>{t('viewReceipt.serviceLabel')}</Text>
              </View>
            )}
            {tipAmt > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownValue}>{tipAmt.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>{t('viewReceipt.tipLabel')}</Text>
              </View>
            )}
          </View>
        )}

        {bill.notes && (
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>{t('viewReceipt.notesTitle')}</Text>
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
  closedBadge: { backgroundColor: Colors.textMuted + '22' },
  closedBadgeText: { color: Colors.textMuted },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  actionButton: { flex: 1, height: 44 },

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

  payCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  payLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  payAmount: { fontSize: 24, fontWeight: '800', color: Colors.primary, marginBottom: 12 },
  payButton: { alignSelf: 'stretch' },
  payPendingText: { fontSize: 13, fontWeight: '600', color: Colors.warning, textAlign: 'center' },
  paySettledText: { fontSize: 13, fontWeight: '600', color: Colors.success, textAlign: 'center' },
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
