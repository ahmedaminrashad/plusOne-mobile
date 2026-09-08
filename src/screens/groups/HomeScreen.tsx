import React, { useCallback, memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import { useGetGroupsQuery, useGetMyInvitationsQuery } from '../../store/api/groupsApi';
import GroupCard from '../../components/groups/GroupCard';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { PeopleIcon, BellIcon, ReceiptIcon, PersonIcon } from '../../components/icons';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useGetHomeSummaryQuery } from '../../store/api/ledgerApi';
import { formatCurrency } from '../../utils/format';
import { Group } from '../../types/models';

type Props = AppScreenProps<'Home'>;

const PREVIEW_COUNT = 4;

const TILES = [
  { key: 'newGroup', labelKey: 'home.tileNewGroup', Icon: PeopleIcon, iconColor: Colors.primary, bg: Colors.tint, screen: 'CreateGroup' as const },
  { key: 'circle', labelKey: 'home.tileMyCircle', Icon: PersonIcon, iconColor: Colors.warningDark, bg: Colors.warningTint, screen: 'MyCircle' as const },
  { key: 'remind', labelKey: 'home.tileRemind', Icon: BellIcon, iconColor: Colors.secondaryDark, bg: Colors.successTint, screen: 'Remind' as const },
  { key: 'ledger', labelKey: 'home.tileMyLedger', Icon: ReceiptIcon, iconColor: Colors.primary, bg: Colors.tint, screen: 'MyLedger' as const },
];

function HomeHeader({
  greeting,
  pendingCount,
  owed,
  owe,
  onNotifications,
  onSettle,
  onTile,
  onViewAll,
  isError,
}: {
  greeting: string;
  pendingCount: number;
  owed: number;
  owe: number;
  onNotifications: () => void;
  onSettle: () => void;
  onTile: (screen: (typeof TILES)[number]['screen']) => void;
  onViewAll: () => void;
  isError: boolean;
}) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: me } = useGetMeQuery();

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Avatar name={me?.displayName} seed={me?.id} size={40} />
          <Text style={[typography.labelLarge, styles.headerGreeting]} numberOfLines={1}>
            {greeting}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onNotifications} activeOpacity={0.7}>
          <BellIcon size={20} color={Colors.text} />
          {pendingCount > 0 ? <View style={styles.badgeDot} /> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={[typography.labelMedium, styles.heroLabel]}>{t('home.acrossAllGroups')}</Text>
          <TouchableOpacity style={styles.settleBtn} onPress={onSettle} activeOpacity={0.8}>
            <Text style={[typography.labelMedium, styles.settleBtnText]}>{t('home.settleUp')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroAmounts}>
          <View>
            <Text style={[typography.bodySmall, styles.heroAmountLabel]}>{t('home.youAreOwed')}</Text>
            <Text style={[typography.amountMedium, styles.heroAmount]}>{formatCurrency(owed / 100)}</Text>
          </View>
          <View>
            <Text style={[typography.bodySmall, styles.heroAmountLabel]}>{t('home.youOwe')}</Text>
            <Text style={[typography.amountMedium, styles.heroAmount]}>{formatCurrency(owe / 100)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tileRow}>
        {TILES.map((tile) => (
          <TouchableOpacity key={tile.key} style={styles.tile} onPress={() => onTile(tile.screen)} activeOpacity={0.75}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.bg }]}>
              <tile.Icon size={26} color={tile.iconColor} />
            </View>
            <Text style={[typography.labelMedium, styles.tileLabel]}>{t(tile.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleBlock}>
          <Text style={[typography.headingMedium, styles.sectionTitle]}>{t('home.yourGroups')}</Text>
          <Text style={[typography.bodySmall, styles.sectionSubtitle]}>{t('home.yourGroupsSubtitle')}</Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[typography.labelMedium, styles.viewAll]}>{t('home.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      {isError ? <Text style={[typography.bodyMedium, styles.errorBanner]}>{t('home.loadError')}</Text> : null}
    </View>
  );
}

const HomeHeaderMemo = memo(HomeHeader);

function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: me } = useGetMeQuery();
  const { data: groups, isLoading, refetch, isError } = useGetGroupsQuery();
  const { data: invitations, refetch: refetchInvites } = useGetMyInvitationsQuery();
  const { data: home, refetch: refetchHome } = useGetHomeSummaryQuery();
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([refetch(), refetchHome(), refetchInvites()]);
    } finally {
      setManualRefreshing(false);
    }
  }, [refetch, refetchHome, refetchInvites]);

  const pendingCount =
    (invitations?.length ?? home?.invitationCount ?? 0) + (home?.approvalCount ?? 0) + (home?.toPayCount ?? 0);
  const owed = home?.owedPiastres ?? 0;
  const owe = home?.owePiastres ?? 0;
  const firstName = me?.displayName?.split(' ')[0];
  const greeting = firstName ? t('home.greetingWithName', { name: firstName }) : t('home.greeting');
  const previewGroups = useMemo(() => (groups ?? []).slice(0, PREVIEW_COUNT), [groups]);

  const handleGroupPress = useCallback(
    (groupId: string, groupName: string) => navigation.navigate('GroupDetail', { groupId, groupName }),
    [navigation],
  );

  const onNotifications = useCallback(() => navigation.navigate('Notifications'), [navigation]);
  const onSettle = useCallback(() => navigation.navigate('SettleUp'), [navigation]);
  const onViewAll = useCallback(() => navigation.navigate('AllGroups'), [navigation]);
  const onTile = useCallback((screen: (typeof TILES)[number]['screen']) => navigation.navigate(screen), [navigation]);
  const onCreateGroup = useCallback(() => navigation.navigate('CreateGroup'), [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: Group }) => (
      <GroupCard group={item} onPress={() => handleGroupPress(item.id, item.name)} />
    ),
    [handleGroupPress],
  );

  const listHeader = (
    <HomeHeaderMemo
      greeting={greeting}
      pendingCount={pendingCount}
      owed={owed}
      owe={owe}
      onNotifications={onNotifications}
      onSettle={onSettle}
      onTile={onTile}
      onViewAll={onViewAll}
      isError={!!isError}
    />
  );

  const listEmpty =
    !isLoading && previewGroups.length === 0 ? (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <PeopleIcon size={44} color={Colors.primary} />
        </View>
        <Text style={[typography.headingMedium, styles.emptyTitle]}>{t('home.emptyTitle')}</Text>
        <Text style={[typography.bodyMedium, styles.emptySubtitle]}>{t('home.emptySubtitle')}</Text>
        <Button title={t('home.createGroupCta')} onPress={onCreateGroup} style={styles.emptyCta} />
      </View>
    ) : isLoading ? (
      <ActivityIndicator color={Colors.secondary} style={styles.loader} />
    ) : null;

  return (
    <SafeScreen style={styles.container} keepMounted={false}>
      <FlatList
        data={previewGroups}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={previewGroups.length === 0 ? styles.listEmpty : styles.list}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={Colors.secondary} />
        }
        initialNumToRender={4}
        windowSize={3}
        removeClippedSubviews={false}
      />
    </SafeScreen>
  );
}

export default memo(HomeScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerGreeting: { color: Colors.textSecondary, flexShrink: 1 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.danger,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, flexShrink: 1 },
  heroAmounts: { flexDirection: 'row', gap: 24 },
  heroAmountLabel: { color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  heroAmount: { color: '#FFFFFF' },
  settleBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settleBtnText: { color: '#FFFFFF' },
  tileRow: { flexDirection: 'row', paddingTop: 18, gap: 10 },
  tile: { flex: 1, alignItems: 'center', gap: 6 },
  tileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: { color: Colors.text, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 24,
    paddingBottom: 10,
    gap: 12,
  },
  sectionTitleBlock: { flex: 1 },
  sectionTitle: { color: Colors.text },
  sectionSubtitle: { color: Colors.textSecondary, marginTop: 2 },
  viewAll: { color: Colors.primary, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  listEmpty: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 110 },
  loader: { marginVertical: 24 },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: Colors.text, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },
  emptyCta: { marginTop: 8, width: '100%' },
  errorBanner: {
    backgroundColor: Colors.dangerTint,
    color: Colors.danger,
    textAlign: 'center',
    padding: 10,
    borderRadius: Radius.md,
    marginBottom: 8,
  },
});
