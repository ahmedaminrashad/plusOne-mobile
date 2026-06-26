import React, { useCallback, memo, useEffect, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import {
  useGetGroupsQuery,
  useGetMyInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../../store/api/groupsApi';
import { Group } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import InvitationPromptModal from '../../components/groups/InvitationPromptModal';
import { Colors } from '../../constants/colors';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { clearAuth } from '../../store/slices/authSlice';
import { baseApi } from '../../store/api/baseApi';
import { SecureStorage } from '../../utils/storage';
import { useGetMeQuery } from '../../store/api/usersApi';

type Props = AppScreenProps<'Home'>;

const GROUP_ACCENT_PALETTE = Colors.groupAccents as readonly string[];

function getGroupAccent(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return GROUP_ACCENT_PALETTE[Math.abs(h) % GROUP_ACCENT_PALETTE.length];
}

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const accent = getGroupAccent(group.id);
  const activeMembers = group.members?.filter((m) => m.status === 'active').length ?? 0;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <Avatar uri={group.avatarUrl} name={group.name} size={46} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{group.name}</Text>
        <Text style={styles.cardMeta}>{activeMembers} عضو نشط</Text>
      </View>
      <Text style={styles.cardChevron}>›</Text>
    </TouchableOpacity>
  );
}

function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { data: me } = useGetMeQuery();
  const { data: groups, isLoading, isFetching, refetch, isError } = useGetGroupsQuery();
  const { data: invitations } = useGetMyInvitationsQuery();
  const [accept] = useAcceptInvitationMutation();
  const [decline] = useDeclineInvitationMutation();

  const pendingCount = invitations?.length ?? 0;
  const [showModal, setShowModal] = useState(false);
  const shownRef = useRef(false);

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
    (group: Group) => navigation.navigate('GroupDetail', { groupId: group.id, groupName: group.name }),
    [navigation],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          await SecureStorage.clearTokens();
          dispatch(baseApi.util.resetApiState());
          dispatch(clearAuth());
        },
      },
    ]);
  }, [dispatch]);

  const firstName = me?.displayName?.split(' ')[0];
  const greeting = firstName ? `مرحباً، ${firstName}` : 'مرحباً';

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>👥</Text>
      </View>
      <Text style={styles.emptyTitle}>لا توجد مجموعات بعد</Text>
      <Text style={styles.emptySubtitle}>أنشئ مجموعتك الأولى وابدأ في تتبع المصاريف مع أصدقائك وعائلتك</Text>
      <Button title="+ إنشاء مجموعة" onPress={() => navigation.navigate('CreateGroup')} style={styles.emptyCta} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* decorative circles */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />
        <View style={styles.deco3} />

        {/* top row */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLogo}>+one</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Invitations')}
              activeOpacity={0.7}>
              <Text style={styles.headerIconText}>🔔</Text>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.headerIconText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* greeting + CTA */}
        <View style={styles.headerBottom}>
          <View>
            <Text style={styles.headerGreeting}>{greeting}</Text>
            <Text style={styles.headerSub}>مجموعاتك</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateGroup')} activeOpacity={0.85}>
            <Text style={styles.createBtnText}>+ جديد</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isError && (
        <Text style={styles.errorBanner}>تعذر تحميل المجموعات. اسحب للأسفل للمحاولة.</Text>
      )}

      <FlatList
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={() => handleGroupPress(item)} />
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

  // ── Header ──
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  deco2: {
    position: 'absolute', top: 20, left: -80,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(124,58,237,0.18)',
  },
  deco3: {
    position: 'absolute', bottom: -40, right: 60,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(6,182,212,0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLogo: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerIconText: { fontSize: 18, lineHeight: 22 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.danger,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerGreeting: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  headerSub: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  createBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── List ──
  list: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 32 },
  listEmpty: { flex: 1, paddingHorizontal: 14 },
  loader: { marginVertical: 24 },

  // ── Group Card ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: { width: 5, alignSelf: 'stretch' },
  cardInfo: { flex: 1, marginLeft: 12, paddingVertical: 14 },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardChevron: { fontSize: 22, color: Colors.textMuted, paddingHorizontal: 12 },

  // ── Empty state ──
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryDark + '14',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  emptyCta: { marginTop: 8, width: '100%' },

  // ── Error ──
  errorBanner: {
    backgroundColor: '#FEF2F2', color: '#B91C1C',
    textAlign: 'center', padding: 10, fontSize: 13,
    borderRadius: 12, marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
});
