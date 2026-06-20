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

type Props = AppScreenProps<'Home'>;

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const activeMembers = group.members?.filter((m) => m.status === 'active').length ?? 0;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <Avatar uri={group.avatarUrl} name={group.name} size={50} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{group.name}</Text>
        <Text style={styles.cardMeta}>{activeMembers} عضو</Text>
      </View>
    </TouchableOpacity>
  );
}

function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { data: groups, isLoading, isFetching, refetch, isError } = useGetGroupsQuery();
  const { data: invitations } = useGetMyInvitationsQuery();
  const [accept] = useAcceptInvitationMutation();
  const [decline] = useDeclineInvitationMutation();

  const pendingCount = invitations?.length ?? 0;
  const [showModal, setShowModal] = useState(false);
  const shownRef = useRef(false);

  // Show modal once when pending invitations are first detected
  useEffect(() => {
    if (!shownRef.current && invitations && invitations.length > 0) {
      shownRef.current = true;
      setShowModal(true);
    }
  }, [invitations]);

  const handleAccept = useCallback(
    async (membershipId: string) => {
      await accept(membershipId).unwrap();
    },
    [accept],
  );

  const handleDecline = useCallback(
    async (membershipId: string) => {
      await decline(membershipId).unwrap();
    },
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

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyTitle}>لا توجد مجموعات بعد</Text>
      <Text style={styles.emptySubtitle}>أنشئ مجموعتك الأولى وابدأ في تتبع المصاريف مع أصدقائك</Text>
      <Button title="إنشاء مجموعة" onPress={() => navigation.navigate('CreateGroup')} style={styles.emptyCta} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>+one</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Invitations')}
            activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>🔔</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>🚪</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateGroup')}>
            <Text style={styles.createBtnText}>+</Text>
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
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListFooterComponent={
          isLoading ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : null
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: { fontSize: 18, lineHeight: 22 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: Colors.textOnPrimary, fontSize: 10, fontWeight: '700' },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: { fontSize: 24, color: Colors.textOnPrimary, lineHeight: 28 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  listEmpty: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardInfo: { flex: 1, marginLeft: 14 },
  cardName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  cardMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCta: { marginTop: 8, width: '100%' },
  loader: { marginVertical: 24 },
  errorBanner: {
    backgroundColor: Colors.dangerLight,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    padding: 10,
    fontSize: 13,
  },
});
