import React, { useCallback, useMemo, useState, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import Avatar from '../../components/common/Avatar';
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
      await Promise.all(selectedRows.flatMap((r) => r.shareIds).map((id) => sendReminder(id).unwrap()));
      navigation.goBack();
    } catch {
      Alert.alert(t('common:error'), t('remind.sendFailed'));
    }
  }, [selectedRows, sendReminder, navigation, t]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.headingLarge, styles.back]}>‹</Text>
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('remind.title')}</Text>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
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
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.row, selected.has(item.key) && styles.rowSelected]} onPress={() => toggleRow(item.key)}>
                <Avatar name={item.counterpartName} size={40} />
                <View style={styles.rowInfo}>
                  <Text style={[typography.labelLarge, styles.rowName]}>{item.counterpartName}</Text>
                  <Text style={[typography.bodySmall, styles.rowGroup]}>{item.groupName}</Text>
                </View>
                <Text style={[typography.amountMedium, styles.rowAmount]}>{formatCurrency(item.amountPiastres / 100)}</Text>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              firstRow ? (
                <View style={styles.previewCard}>
                  <Text style={[typography.labelMedium, styles.previewHeader]}>{t('remind.theyllReceive')}</Text>
                  <Text style={[typography.caption, styles.rateLimitNote]}>{t('remind.rateLimitNote')}</Text>
                  <View style={styles.previewBubble}>
                    <Text style={[typography.labelSmall, styles.previewSender]}>{t('remind.previewSender')}</Text>
                    <Text style={[typography.bodyMedium, styles.previewMessage]}>
                      {t('remind.previewMessage', {
                        name: firstRow.counterpartName,
                        group: firstRow.groupName,
                        amount: (firstRow.amountPiastres / 100).toFixed(2),
                      })}
                    </Text>
                  </View>
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
    </SafeAreaView>
  );
}

export default memo(RemindScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { color: Colors.accent },
  title: { color: Colors.text },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionHeader: { color: Colors.textSecondary, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: Colors.primary },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.text },
  rowGroup: { color: Colors.textMuted, marginTop: 2 },
  rowAmount: { color: Colors.text },

  previewCard: { marginTop: 16 },
  previewHeader: { color: Colors.textSecondary, marginBottom: 4 },
  rateLimitNote: { color: Colors.textMuted, marginBottom: 10 },
  previewBubble: { backgroundColor: Colors.tint, borderRadius: Radius.lg, padding: 14 },
  previewSender: { color: Colors.primary, marginBottom: 4 },
  previewMessage: { color: Colors.text },

  bottomBar: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  sendBtn: { height: 52, borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: Colors.textOnPrimary },
});
