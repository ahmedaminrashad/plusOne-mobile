import React, { useCallback, useMemo, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import GroupCard from '../../components/groups/GroupCard';
import GroupBalanceCollector from '../../components/groups/GroupBalanceCollector';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';

type Props = AppScreenProps<'AllGroups'>;

type Filter = 'all' | 'owedToMe' | 'iOwe' | 'settled';

function AllGroupsScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: groups } = useGetGroupsQuery();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [balances, setBalances] = useState<Record<string, number>>({});

  const handleBalance = useCallback((groupId: string, net: number) => {
    setBalances((prev) => (prev[groupId] === net ? prev : { ...prev, [groupId]: net }));
  }, []);

  const filtered = useMemo(() => {
    let list = groups ?? [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (filter !== 'all') {
      list = list.filter((g) => {
        const net = balances[g.id] ?? 0;
        if (filter === 'owedToMe') return net > 0;
        if (filter === 'iOwe') return net < 0;
        return net === 0;
      });
    }
    return list;
  }, [groups, query, filter, balances]);

  const handleGroupPress = useCallback(
    (groupId: string, groupName: string) => navigation.navigate('GroupDetail', { groupId, groupName }),
    [navigation],
  );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('allGroups.filterAll') },
    { key: 'owedToMe', label: t('allGroups.filterOwedToMe') },
    { key: 'iOwe', label: t('allGroups.filterIOwe') },
    { key: 'settled', label: t('allGroups.filterSettled') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {(groups ?? []).map((g) => (
        <GroupBalanceCollector key={g.id} groupId={g.id} onBalance={handleBalance} />
      ))}

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.headingLarge, styles.back]}>‹</Text>
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('navigation:appStack.allGroupsTitle')}</Text>
      </View>
      <Text style={[typography.bodyMedium, styles.count]}>
        {t('allGroups.groupsCount', { count: groups?.length ?? 0 })}
      </Text>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[typography.bodyMedium, styles.searchInput]}
          placeholder={t('allGroups.searchPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}>
            <Text style={[typography.labelMedium, filter === f.key ? styles.filterTextActive : styles.filterText]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={() => handleGroupPress(item.id, item.name)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[typography.bodyMedium, styles.empty]}>{t('allGroups.emptyTitle')}</Text>
        }
      />

      <TouchableOpacity style={styles.newGroupBtn} onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.85}>
        <Text style={[typography.labelLarge, styles.newGroupBtnText]}>{t('allGroups.newGroupCta')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default memo(AllGroupsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  back: { color: Colors.accent },
  title: { color: Colors.text },
  count: { color: Colors.textMuted, paddingHorizontal: 20, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    marginHorizontal: 20, marginTop: 14, paddingHorizontal: 16, height: 46, gap: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: Colors.text, padding: 0 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary },
  filterTextActive: { color: Colors.textOnPrimary },
  list: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 90 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 32 },
  newGroupBtn: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.pill,
    paddingHorizontal: 24, paddingVertical: 14,
    shadowColor: Colors.primaryDark, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6,
  },
  newGroupBtnText: { color: Colors.textOnPrimary },
});
