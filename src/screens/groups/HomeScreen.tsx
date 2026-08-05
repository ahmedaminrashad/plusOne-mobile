import React, { useCallback, useMemo, memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import {
  useGetGroupsQuery,
  useGetMyInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../../store/api/groupsApi';
import GroupCard from '../../components/groups/GroupCard';
import GroupBalanceCollector from '../../components/groups/GroupBalanceCollector';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import InvitationPromptModal from '../../components/groups/InvitationPromptModal';
import { PeopleIcon, BellIcon, ReceiptIcon, PersonIcon } from '../../components/icons';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useGetMySharesQuery } from '../../store/api/sharesApi';
import { formatCurrency, resolveAssetUrl } from '../../utils/format';

type Props = AppScreenProps<'Home'>;

const PREVIEW_COUNT = 4;

function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: me } = useGetMeQuery();
  const { data: groups, isLoading, isFetching, refetch, isError } = useGetGroupsQuery();
  const { data: invitations } = useGetMyInvitationsQuery();
  const { data: myShares } = useGetMySharesQuery();
  const [accept] = useAcceptInvitationMutation();
  const [decline] = useDeclineInvitationMutation();

  const approvalCount = useMemo(
    () => (myShares ?? []).filter((s) => s.status === 'initiated' && s.initiatorUserId === me?.id).length,
    [myShares, me?.id],
  );
  const pendingCount = (invitations?.length ?? 0) + approvalCount;
  const [showModal, setShowModal] = useState(false);
  const shownRef = useRef(false);

  const [balances, setBalances] = useState<Record<string, number>>({});
  const handleBalance = useCallback((groupId: string, net: number) => {
    setBalances((prev) => (prev[groupId] === net ? prev : { ...prev, [groupId]: net }));
  }, []);

  const { owed, owe } = useMemo(() => {
    let owedTotal = 0;
    let oweTotal = 0;
    for (const net of Object.values(balances)) {
      if (net > 0) owedTotal += net;
      else oweTotal += -net;
    }
    return { owed: owedTotal, owe: oweTotal };
  }, [balances]);

  useEffect(() => {
    if (!shownRef.current && invitations && invitations.length > 0) {
      shownRef.current = true;
      setShowModal(true);
    }
  }, [invitations]);

  const handleAccept = useCallback(
    async (membershipId: string) => { await accept(membershipId).unwrap(); },
    [accept],
  );

  const handleDecline = useCallback(
    async (membershipId: string) => { await decline(membershipId).unwrap(); },
    [decline],
  );

  const handleGroupPress = useCallback(
    (groupId: string, groupName: string) => navigation.navigate('GroupDetail', { groupId, groupName }),
    [navigation],
  );

  const firstName = me?.displayName?.split(' ')[0];
  const greeting = firstName ? t('home.greetingWithName', { name: firstName }) : t('home.greeting');
  const previewGroups = (groups ?? []).slice(0, PREVIEW_COUNT);

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <PeopleIcon size={44} color={Colors.primary} />
      </View>
      <Text style={[typography.headingMedium, styles.emptyTitle]}>{t('home.emptyTitle')}</Text>
      <Text style={[typography.bodyMedium, styles.emptySubtitle]}>{t('home.emptySubtitle')}</Text>
      <Button title={t('home.createGroupCta')} onPress={() => navigation.navigate('CreateGroup')} style={styles.emptyCta} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {(groups ?? []).map((g) => (
        <GroupBalanceCollector key={g.id} groupId={g.id} onBalance={handleBalance} />
      ))}

      <FlatList
        data={previewGroups}
        keyExtractor={(g) => g.id}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Avatar uri={resolveAssetUrl(me?.photoUrl)} name={me?.displayName} seed={me?.id} size={40} />
                <Text style={[typography.labelLarge, styles.headerGreeting]} numberOfLines={2}>{greeting}</Text>
              </View>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}>
                <BellIcon size={20} color={Colors.text} />
                {pendingCount > 0 && <View style={styles.badgeDot} />}
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={[typography.labelMedium, styles.heroLabel]}>{t('home.acrossAllGroups')}</Text>
                <TouchableOpacity style={styles.settleBtn} onPress={() => navigation.navigate('SettleUp')} activeOpacity={0.8}>
                  <Text style={[typography.labelMedium, styles.settleBtnText]}>{t('home.settleUp')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.heroRow}>
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
            </View>

            <View style={styles.tileRow}>
              {[
                { label: t('home.tileNewGroup'), Icon: PeopleIcon, iconColor: Colors.primary, onPress: () => navigation.navigate('CreateGroup'), bg: Colors.tint },
                { label: t('home.tileMyCircle'), Icon: PersonIcon, iconColor: Colors.warningDark, onPress: () => navigation.navigate('MyCircle'), bg: Colors.warningTint },
                { label: t('home.tileRemind'), Icon: BellIcon, iconColor: Colors.secondaryDark, onPress: () => navigation.navigate('Remind'), bg: Colors.successTint },
                { label: t('home.tileMyLedger'), Icon: ReceiptIcon, iconColor: Colors.text, onPress: () => navigation.navigate('MyLedger'), bg: Colors.tileMyTab },
              ].map((tile) => (
                <TouchableOpacity key={tile.label} style={styles.tile} onPress={tile.onPress} activeOpacity={0.75}>
                  <View style={[styles.tileIconWrap, { backgroundColor: tile.bg }]}>
                    <tile.Icon size={26} color={tile.iconColor} />
                  </View>
                  <Text style={[typography.labelMedium, styles.tileLabel]}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[typography.headingMedium, styles.sectionTitle]}>{t('home.yourGroups')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllGroups')}>
                <Text style={[typography.labelMedium, styles.viewAll]}>{t('home.viewAll')}</Text>
              </TouchableOpacity>
            </View>

            {isError && <Text style={[typography.bodyMedium, styles.errorBanner]}>{t('home.loadError')}</Text>}
          </>
        }
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={() => handleGroupPress(item.id, item.name)} />
        )}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        contentContainerStyle={
          (!groups || groups.length === 0) && !isLoading ? styles.listEmpty : styles.list
        }
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.secondary} />
        }
        ListFooterComponent={
          isLoading ? <ActivityIndicator color={Colors.secondary} style={styles.loader} /> : null
        }
      />

      {showModal && invitations && invitations.length > 0 && (
        <InvitationPromptModal
          invitations={invitations}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onDismiss={() => setShowModal(false)}
        />
      )}
    </SafeAreaView>
  );
}

export default memo(HomeScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header — plain canvas, no banner ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  headerGreeting: { color: Colors.textSecondary, flexShrink: 1 },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.danger,
  },

  // ── Hero balance card — self-contained inset card, not a banner ──
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    marginHorizontal: 16,
    marginTop: 4,
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
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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

  // ── Tiles ──
  tileRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 18, gap: 10 },
  tile: { flex: 1, alignItems: 'center', gap: 6 },
  tileIconWrap: {
    width: 56, height: 56, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  tileLabel: { color: Colors.text, textAlign: 'center' },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 10,
  },
  sectionTitle: { color: Colors.text },
  viewAll: { color: Colors.primary },

  // ── List ──
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  listEmpty: { flex: 1, paddingHorizontal: 16 },
  loader: { marginVertical: 24 },

  // ── Empty state ──
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.tint,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: Colors.text, textAlign: 'center' },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },
  emptyCta: { marginTop: 8, width: '100%' },

  // ── Error ──
  errorBanner: {
    backgroundColor: Colors.dangerTint, color: Colors.danger,
    textAlign: 'center', padding: 10,
    borderRadius: Radius.md, marginHorizontal: 14, marginBottom: 8,
  },
});
