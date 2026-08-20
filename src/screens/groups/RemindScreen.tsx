import React, { useCallback, useMemo, useState, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Avatar from '../../components/common/Avatar';
import { ChevronLeftIcon, BellIcon, CheckIcon } from '../../components/icons';
import { useGetMySharesQuery, useSendShareReminderMutation } from '../../store/api/sharesApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { formatCurrency } from '../../utils/format';
import { aggregateSharesByCounterpart } from '../../utils/shareAggregation';

type Props = AppScreenProps<'Remind'>;

function RemindScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: me } = useGetMeQuery();
  const { data: shares, isLoading } = useGetMySharesQuery();
  const [sendReminder, { isLoading: isSending }] = useSendShareReminderMutation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const remindable = useMemo(
    () => (shares ?? []).filter((s) => s.initiatorUserId === me?.id && (s.status === 'pending' || s.status === 'failed')),
    [shares, me?.id],
  );
  const rows = useMemo(() => aggregateSharesByCounterpart(remindable, true), [remindable]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.key));

  const toggleRow = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  React.useEffect(() => {
    setSelected(new Set(rows.map((r) => r.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  const selectedRows = rows.filter((r) => selected.has(r.key));
  const selectedTotal = selectedRows.reduce((sum, r) => sum + r.amountPiastres, 0);
  const firstRow = selectedRows[0];

  const handleSend = useCallback(async () => {
    try {
      const results = await Promise.all(
        selectedRows.flatMap((r) => r.shareIds).map((id) => sendReminder(id).unwrap()),
      );
      const sent = results.filter((r) => r.sent).length;
      const rateLimited = results.filter((r) => r.rateLimited).length;
      if (sent > 0) {
        Alert.alert(
          t('settleUp.remindSentTitle'),
          t('settleUp.remindSentMessage', { count: sent }),
          [{ text: t('common:ok'), onPress: () => navigation.goBack() }],
        );
      } else if (rateLimited > 0) {
        Alert.alert(t('settleUp.remindRateLimitedTitle'), t('settleUp.remindRateLimitedMessage'));
      } else {
        Alert.alert(t('common:error'), t('remind.sendFailed'));
      }
    } catch {
      Alert.alert(t('common:error'), t('remind.sendFailed'));
    }
  }, [selectedRows, sendReminder, navigation, t]);

  if (isLoading) {
    return (
      <SafeScreen style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('remind.title')}</Text>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <BellIcon size={40} color={Colors.textSecondary} />
          <Text style={[typography.headingMedium, styles.emptyTitle]}>{t('remind.emptyTitle')}</Text>
          <Text style={[typography.bodyMedium, styles.emptySubtitle]}>{t('remind.emptySubtitle')}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={rows}
            keyExtractor={(r) => r.key}
            contentContainerStyle={styles.list}
            ListHeaderComponent={<Text style={[typography.labelMedium, styles.sectionHeader]}>{t('remind.waitingOn')}</Text>}
            renderItem={({ item }) => {
              const isSelected = selected.has(item.key);
              return (
                <TouchableOpacity style={styles.row} onPress={() => toggleRow(item.key)}>
                  <Avatar name={item.counterpartName} seed={item.counterpartId ?? item.counterpartPhone} size={28} style={styles.avatarBorder} />
                  <View style={styles.rowInfo}>
                    <Text style={[typography.labelLarge, styles.rowName]}>{item.counterpartName}</Text>
                    <Text style={[typography.bodySmall, styles.rowGroup]}>{item.groupName}</Text>
                  </View>
                  <Text style={[typography.amountMedium, styles.rowAmount]}>{formatCurrency(item.amountPiastres / 100)}</Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <CheckIcon size={13} color={Colors.textOnPrimary} strokeWidth={2.5} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              firstRow ? (
                <View style={styles.previewCard}>
                  <Text style={[typography.labelMedium, styles.previewHeader]}>{t('remind.theyllReceive')}</Text>
                  <View style={styles.previewBubble}>
                    <View style={styles.previewSenderRow}>
                      <View style={styles.previewIcon} />
                      <Text style={[typography.labelSmall, styles.previewSender]}>{t('remind.previewSender')}</Text>
                    </View>
                    <Text style={[typography.bodyMedium, styles.previewMessage]}>
                      {t('remind.previewMessage', {
                        name: me?.displayName ?? t('groupDetail.defaultUserName'),
                        bill: firstRow.billName || t('groupDetail.defaultBillName'),
                        group: firstRow.groupName,
                        amount: (firstRow.amountPiastres / 100).toFixed(2),
                      })}
                    </Text>
                  </View>
                  <Text style={[typography.caption, styles.rateLimitNote]}>{t('remind.rateLimitNote')}</Text>
                </View>
              ) : null
            }
          />

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.sendBtn, selectedRows.length === 0 && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={selectedRows.length === 0 || isSending}>
              <Text style={[typography.labelLarge, styles.sendBtnText]}>
                {t('remind.sendButton', { count: selectedRows.length })}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeScreen>
  );
}

export default memo(RemindScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: Colors.text },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionHeader: { color: Colors.textSecondary, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  avatarBorder: { borderWidth: 2, borderColor: Colors.surface },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.text },
  rowGroup: { color: Colors.textSecondary, marginTop: 2 },
  rowAmount: { color: Colors.text },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.borderLight,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  previewCard: { marginTop: 16 },
  previewHeader: { color: Colors.textSecondary, marginBottom: 4 },
  rateLimitNote: { color: Colors.textSecondary, marginTop: 10 },
  previewBubble: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 14 },
  previewSenderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  previewIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary },
  previewSender: { color: Colors.text },
  previewMessage: { color: Colors.textSecondary },

  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  sendBtn: { height: 52, borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: Colors.textOnPrimary },
});
