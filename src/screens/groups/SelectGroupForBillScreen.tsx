import React, { useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { Group } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { ChevronRightIcon, ChevronLeftIcon, ReceiptIcon } from '../../components/icons';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { resolveAssetUrl } from '../../utils/format';

type Props = AppScreenProps<'SelectGroupForBill'>;

function SelectGroupForBillScreen({ route, navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const receiptJson = route.params?.receiptJson;
  const pickingForNew = !receiptJson;
  const { data: groups, isLoading, isError, refetch } = useGetGroupsQuery();

  const handlePress = useCallback(
    (group: Group) => {
      if (receiptJson) {
        navigation.replace('AssignItems', {
          groupId: group.id,
          groupName: group.name,
          receiptJson,
        });
        return;
      }
      navigation.navigate('AddBillChooser', { groupId: group.id, groupName: group.name });
    },
    [navigation, receiptJson],
  );

  if (isLoading) {
    return (
      <SafeScreen style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[typography.headingLarge, styles.title]}>
            {t(pickingForNew ? 'selectGroupForBill.titleNew' : 'selectGroupForBill.title')}
          </Text>
          <Text style={[typography.bodyMedium, styles.subtitle]}>
            {t(pickingForNew ? 'selectGroupForBill.subtitleNew' : 'selectGroupForBill.subtitle')}
          </Text>
        </View>
      </View>

      {isError && (
        <TouchableOpacity onPress={() => refetch()} activeOpacity={0.8}>
          <Text style={[typography.bodyMedium, styles.errorBanner]}>{t('selectGroupForBill.loadError')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handlePress(item)} activeOpacity={0.75}>
            <Avatar uri={resolveAssetUrl(item.avatarUrl)} name={item.name} size={44} />
            <View style={styles.rowText}>
              <Text style={[typography.labelLarge, styles.rowName]} numberOfLines={1}>{item.name}</Text>
              <Text style={[typography.bodySmall, styles.rowMeta]}>
                {t('selectGroupForBill.membersCount', {
                  count: (item.members ?? []).filter((m) => m.status === 'active').length,
                })}
              </Text>
            </View>
            <ChevronRightIcon size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        contentContainerStyle={
          (!groups || groups.length === 0) ? styles.listEmpty : styles.list
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <ReceiptIcon size={40} color={Colors.textMuted} />
            </View>
            <Text style={[typography.headingSmall, styles.emptyTitle]}>
              {t(pickingForNew ? 'home.emptyTitle' : 'selectGroupForBill.emptyTitle')}
            </Text>
            <Text style={[typography.bodyMedium, styles.emptySubtitle]}>
              {t(pickingForNew ? 'home.emptySubtitle' : 'selectGroupForBill.emptySubtitle')}
            </Text>
            <Button
              title={t(pickingForNew ? 'home.createGroupCta' : 'selectGroupForBill.createGroupCta')}
              onPress={() => navigation.navigate('CreateGroup')}
              style={styles.emptyCta}
            />
          </View>
        }
      />
    </SafeScreen>
  );
}

export default memo(SelectGroupForBillScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 2,
  },
  headerText: { flex: 1 },
  title: { color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: 4 },

  list: { paddingHorizontal: 16, paddingBottom: 24 },
  listEmpty: { flexGrow: 1, paddingHorizontal: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { color: Colors.text },
  rowMeta: { color: Colors.textSecondary, marginTop: 2 },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    textAlign: 'center',
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    overflow: 'hidden',
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyIcon: { marginBottom: 4 },
  emptyTitle: { color: Colors.text, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCta: { marginTop: 16, alignSelf: 'stretch' },
});
