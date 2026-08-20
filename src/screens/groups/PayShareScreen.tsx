import React, { useMemo, memo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useGetBillDetailQuery } from '../../store/api/billsApi';
import { usePayShareMutation, useCancelShareInitiationMutation } from '../../store/api/sharesApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { formatCurrency, resolveAssetUrl } from '../../utils/format';
import { normalizeInstaPayIdentifier, buildInstaPayLink } from '../../utils/instapay';
import { ChevronLeftIcon } from '../../components/icons';

type Props = AppScreenProps<'PayShare'>;

async function tryOpenInstaPay(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

function PayShareScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const { groupId, groupName, billId } = route.params;
  const { data: bill, isLoading, refetch } = useGetBillDetailQuery(billId);
  const { data: me } = useGetMeQuery();
  const [payShare, { isLoading: isPaying }] = usePayShareMutation();
  const [cancelInitiation] = useCancelShareInitiationMutation();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const myShare = useMemo(() => bill?.shares.find((s) => s.ownerUserId === me?.id), [bill?.shares, me?.id]);
  const payerName = bill?.paidBy?.displayName ?? t('viewReceipt.creatorFallback');

  const subtotal = useMemo(
    () => (bill?.lineItems ?? []).reduce((sum, it) => sum + it.qty * it.unitPrice, 0),
    [bill?.lineItems],
  );
  const chargesAmt = useMemo(() => {
    if (!bill) return 0;
    const tax = bill.tax != null ? (bill.taxType === 'percent' ? subtotal * bill.tax / 100 : bill.tax) : 0;
    const delivery = bill.delivery != null ? (bill.deliveryType === 'percent' ? subtotal * bill.delivery / 100 : bill.delivery) : 0;
    return tax + delivery;
  }, [bill, subtotal]);

  const shareAmount = myShare ? myShare.amountPiastres / 100 : 0;
  const shareRatio = Number(bill?.amount ?? 0) > 0 ? shareAmount / Number(bill!.amount) : 0;
  const foodPortion = subtotal * shareRatio;
  const chargesPortion = chargesAmt * shareRatio;

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
              try { await cancelInitiation(myShare.id).unwrap(); } catch { /* already reconciled */ }
            },
          },
          { text: t('viewReceipt.yesPaidButton') },
        ],
      );
    });
    return () => subscription.remove();
  }, [myShare, cancelInitiation, t]);

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
                await payShare({ shareId }).unwrap();
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

  const handlePayInstaPay = useCallback(async () => {
    if (!myShare || !bill) return;
    const rawAlias = bill.paidBy?.instaPayAlias;
    if (!rawAlias) {
      Alert.alert(t('viewReceipt.noAliasTitle'), t('viewReceipt.noAliasMessage', { name: payerName }));
      return;
    }
    const alias = normalizeInstaPayIdentifier(rawAlias);
    const amountText = (myShare.amountPiastres / 100).toFixed(2);
    const shareId = myShare.id;
    const currency = myShare.currency;

    Alert.alert(
      t('viewReceipt.instaPayTitle'),
      t('viewReceipt.payInstructions', { alias, amount: formatCurrency(Number(amountText), currency) }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:continue'),
          onPress: async () => {
            const link = buildInstaPayLink(alias);
            const opened = await tryOpenInstaPay(link);
            if (!opened) {
              showManualCopyFallback(alias, amountText, currency, shareId);
              return;
            }
            awaitingReturnRef.current = true;
            try {
              await payShare({ shareId }).unwrap();
            } catch { /* idempotency conflicts reconciled on resume */ }
          },
        },
      ],
    );
  }, [myShare, bill, payerName, showManualCopyFallback, payShare, t]);

  const handlePayCash = useCallback(() => {
    if (!myShare) return;
    Alert.alert(
      t('payShare.cashConfirmTitle'),
      t('payShare.cashConfirmMessage', { payer: payerName }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:confirm'),
          onPress: async () => {
            try {
              await payShare({ shareId: myShare.id, method: 'cash' }).unwrap();
            } catch {
              Alert.alert(t('common:error'), t('viewReceipt.markPaidFailed'));
            }
          },
        },
      ],
    );
  }, [myShare, payerName, payShare, t]);

  if (isLoading || !bill) {
    return (
      <SafeScreen style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeScreen>
    );
  }

  const displayName = bill.venueName ?? bill.title ?? t('viewReceipt.defaultBillName');

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('payShare.title')}</Text>
      </View>

      <View style={styles.content}>
        {myShare?.status === 'settled' ? (
          <View style={styles.statusCard}>
            <Text style={[typography.headingMedium, styles.settledText]}>{t('viewReceipt.shareSettled')}</Text>
          </View>
        ) : myShare?.status === 'initiated' ? (
          <View style={styles.statusCard}>
            <Text style={[typography.bodyLarge, styles.pendingText]}>
              {t('viewReceipt.awaitingConfirmation', { payerName, amount: formatCurrency(myShare.amountPiastres / 100, myShare.currency) })}
            </Text>
          </View>
        ) : myShare ? (
          <>
            <View style={styles.card}>
              <View style={styles.payerRow}>
                <Avatar uri={resolveAssetUrl(bill.paidBy?.photoUrl)} name={payerName} seed={bill.paidByUserId} size={28} />
                <Text style={[typography.bodyMedium, styles.payerText]}>
                  {t('payShare.toPayerVenue', { payer: payerName, venue: displayName })} · {groupName}
                </Text>
              </View>

              <Text style={[typography.labelMedium, styles.yourShareLabel]}>{t('viewReceipt.yourShareLabel')}</Text>
              <Text style={[typography.amountLarge, styles.shareAmount]}>{formatCurrency(shareAmount)}</Text>
              <Text style={[typography.bodyMedium, styles.splitCaption]}>
                {t('payShare.splitEquallyBetween', {
                  currency: myShare.currency,
                  count: (bill.shares?.filter((s) => s.status !== 'cancelled').length ?? 1),
                })}
              </Text>

              {(foodPortion > 0 || chargesPortion > 0) && (
                <>
                  <View style={styles.separator} />
                  {foodPortion > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={[typography.bodyMedium, styles.breakdownLabel]}>{t('viewReceipt.itemsTitle')}</Text>
                      <Text style={[typography.bodyMedium, styles.breakdownAmt]}>{formatCurrency(foodPortion)}</Text>
                    </View>
                  )}
                  {chargesPortion > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={[typography.bodyMedium, styles.breakdownLabel]}>
                        {t('viewReceipt.taxLabel')} + {t('viewReceipt.deliveryLabel')}
                      </Text>
                      <Text style={[typography.bodyMedium, styles.breakdownAmt]}>{formatCurrency(chargesPortion)}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {(bill.lineItems?.length ?? 0) > 0 && (
              <View style={styles.lineItemsCard}>
                <Text style={[typography.labelMedium, styles.lineItemsTitle]}>{t('viewReceipt.itemsTitle')}</Text>
                {bill.lineItems!.map((it, idx) => (
                  <View key={`${it.name}-${idx}`} style={styles.lineItemRow}>
                    <Text style={[typography.bodyMedium, styles.lineItemName]} numberOfLines={2}>
                      {it.qty > 1 ? `${it.qty}× ` : ''}{it.name}
                    </Text>
                    <Text style={[typography.bodyMedium, styles.lineItemAmt]}>
                      {formatCurrency(it.qty * it.unitPrice)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Button title={t('payShare.payWithInstaPay')} onPress={handlePayInstaPay} loading={isPaying} style={styles.payBtn} />
            <Button title={t('payShare.iPaidInCash')} onPress={handlePayCash} variant="outline" style={styles.cashBtn} />

            <Text style={[typography.caption, styles.footerNote]}>{t('payShare.cashNote', { payer: payerName })}</Text>
            <Text style={[typography.caption, styles.footerNote]}>{t('payShare.instaPayNote', { payer: payerName })}</Text>
          </>
        ) : null}
      </View>
    </SafeScreen>
  );
}

export default memo(PayShareScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
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
  content: { padding: 20, alignItems: 'center' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 16,
  },

  payerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', justifyContent: 'center', marginBottom: 14 },
  payerText: { color: Colors.textSecondary },

  yourShareLabel: { color: Colors.textMuted, letterSpacing: 0.5 },
  shareAmount: { color: Colors.primaryDark, marginTop: 6 },
  splitCaption: { color: Colors.textMuted, marginTop: 4 },

  separator: { height: 1, backgroundColor: Colors.borderLight, alignSelf: 'stretch', marginVertical: 14 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 6 },
  breakdownAmt: { color: Colors.textSecondary },
  breakdownLabel: { color: Colors.textSecondary },

  lineItemsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    alignSelf: 'stretch',
    marginBottom: 16,
    gap: 8,
  },
  lineItemsTitle: { color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineItemName: { color: Colors.text, flex: 1 },
  lineItemAmt: { color: Colors.textSecondary },

  payBtn: { alignSelf: 'stretch', marginBottom: 10 },
  cashBtn: { alignSelf: 'stretch', marginBottom: 16 },
  footerNote: { color: Colors.textMuted, textAlign: 'center', marginBottom: 4 },

  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  settledText: { color: Colors.success },
  pendingText: { color: Colors.warning, textAlign: 'center' },
});
