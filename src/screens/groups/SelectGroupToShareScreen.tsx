import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  Image,
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
import { PeopleIcon, ChevronRightIcon } from '../../components/icons';
import { Colors } from '../../constants/colors';
import { resolveAssetUrl } from '../../utils/format';
import { downsampledSource } from '../../utils/remoteImage';

type Props = AppScreenProps<'SelectGroupToShare'>;

function SelectGroupToShareScreen({ route, navigation }: Props) {
  const { t } = useTranslation('groups');
  const { imageUri } = route.params;
  const { data: groups, isLoading, isError } = useGetGroupsQuery();

  const handlePress = useCallback(
    (group: Group) => {
      navigation.replace('Chat', { groupId: group.id, groupName: group.name, sharedImageUri: imageUri });
    },
    [navigation, imageUri],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.previewRow}>
        <Image source={downsampledSource(imageUri, 56)} resizeMethod="resize" style={styles.preview} resizeMode="cover" />
        <Text style={styles.subtitle}>{t('shareToGroup.subtitle')}</Text>
      </View>

      {isError && <Text style={styles.errorBanner}>{t('shareToGroup.loadError')}</Text>}

      <FlatList
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handlePress(item)} activeOpacity={0.75}>
            <Avatar uri={resolveAssetUrl(item.avatarUrl)} name={item.name} size={44} />
            <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
            <ChevronRightIcon size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        contentContainerStyle={
          (!groups || groups.length === 0) ? styles.listEmpty : styles.list
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <PeopleIcon size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>{t('shareToGroup.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('shareToGroup.emptySubtitle')}</Text>
          </View>
        }
      />
    </SafeScreen>
  );
}

export default SelectGroupToShareScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  preview: { width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.surface },
  subtitle: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  list: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 24 },
  listEmpty: { flex: 1, paddingHorizontal: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },

  errorBanner: {
    backgroundColor: '#FEF2F2', color: '#B91C1C',
    textAlign: 'center', padding: 10, fontSize: 13,
    borderRadius: 12, marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },

  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 8,
  },
  emptyIcon: { marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
