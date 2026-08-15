import React, { useCallback, useMemo, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import GroupCard from '../../components/groups/GroupCard';
import GroupBalanceCollector from '../../components/groups/GroupBalanceCollector';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { ChevronLeftIcon, SearchIcon } from '../../components/icons';

type Props = AppScreenProps<'AllGroups'>;

type Filter = 'all' | 'owedToMe' | 'iOwe' | 'settled';

// Per-filter colors, matching Figma exactly (Section - ALL GROUPS, node 1:2163):
// each chip has its own semantic tint at rest, and switches to a solid fill
// with white text when selected — same color pairing GroupCard uses for its
// balance pills (owed = success, owe = danger, settled = teal tint).
const FILTER_STYLES: Record<Filter, { restBg: string; restText: string; activeBg: string; activeText: string }> = {
  all: { restBg: Colors.tint, restText: Colors.primary, activeBg: Colors.primary, activeText: Colors.textOnPrimary },
  owedToMe: {
    restBg: Colors.successTint,
    restText: Colors.secondaryDark,
    activeBg: Colors.secondary,
    activeText: Colors.textOnPrimary,
  },
  iOwe: { restBg: Colors.dangerTint, restText: Colors.danger, activeBg: Colors.danger, activeText: Colors.textOnPrimary },
  settled: { restBg: Colors.tint, restText: Colors.primary, activeBg: Colors.primary, activeText: Colors.textOnPrimary },
};

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
    <SafeScreen style={styles.container}>
      {(groups ?? []).map((g) => (
        <GroupBalanceCollector key={g.id} groupId={g.id} onBalance={handleBalance} />
      ))}

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeftIcon size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[typography.headingMedium, styles.title]}>{t('navigation:appStack.allGroupsTitle')}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={[typography.labelSmall, styles.countPillText]}>
            {t('allGroups.groupsCount', { count: groups?.length ?? 0 })}
          </Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <SearchIcon size={16} color={Colors.textMuted} />
        <TextInput
          style={[typography.bodyMedium, styles.searchInput]}
          placeholder={t('allGroups.searchPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => {
          const c = FILTER_STYLES[f.key];
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, { backgroundColor: active ? c.activeBg : c.restBg }]}
              onPress={() => setFilter(f.key)}>
              <Text style={[typography.labelSmall, { color: active ? c.activeText : c.restText }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
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
    </SafeScreen>
  );
}

export default memo(AllGroupsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: Colors.text },
  countPill: {
    backgroundColor: Colors.tint, borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countPillText: { color: Colors.primary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    marginHorizontal: 16, marginTop: 14, paddingHorizontal: 16, height: 38, gap: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  searchInput: { flex: 1, color: Colors.text, padding: 0 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.pill },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 32 },
  newGroupBtn: {
    position: 'absolute', bottom: 20, left: 16, right: 16, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.pill, paddingVertical: 14,
    shadowColor: Colors.primaryDark, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  newGroupBtnText: { color: Colors.textOnPrimary },
});
