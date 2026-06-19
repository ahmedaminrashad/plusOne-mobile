import React, { memo, useCallback } from 'react';
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
  useGetMyInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../../store/api/groupsApi';
import { GroupMember } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import { Colors } from '../../constants/colors';

type Props = AppScreenProps<'Invitations'>;

function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  loading,
}: {
  invitation: GroupMember;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  const group = invitation.group;
  return (
    <View style={styles.card}>
      <Avatar uri={group?.avatarUrl} name={group?.name} size={48} />
      <View style={styles.cardBody}>
        <Text style={styles.groupName} numberOfLines={1}>{group?.name ?? '...'}</Text>
        <Text style={styles.cardSub}>تمت دعوتك للانضمام</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.declineBtn]}
          onPress={onDecline}
          disabled={loading}
          activeOpacity={0.7}>
          <Text style={styles.declineBtnText}>رفض</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={onAccept}
          disabled={loading}
          activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.textOnPrimary} />
          ) : (
            <Text style={styles.acceptBtnText}>قبول</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InvitationsScreen({ navigation }: Props) {
  const { data: invitations, isLoading, isFetching, refetch } = useGetMyInvitationsQuery();
  const [accept, { isLoading: accepting }] = useAcceptInvitationMutation();
  const [decline, { isLoading: declining }] = useDeclineInvitationMutation();

  const handleAccept = useCallback(
    async (membershipId: string) => {
      await accept(membershipId);
      navigation.navigate('Home');
    },
    [accept, navigation],
  );

  const handleDecline = useCallback(
    async (membershipId: string) => {
      await decline(membershipId);
    },
    [decline],
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📬</Text>
      <Text style={styles.emptyTitle}>لا توجد دعوات</Text>
      <Text style={styles.emptySubtitle}>ستظهر هنا الدعوات التي تصلك للانضمام إلى المجموعات</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <FlatList
        data={invitations ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InvitationCard
            invitation={item}
            onAccept={() => handleAccept(item.id)}
            onDecline={() => handleDecline(item.id)}
            loading={accepting || declining}
          />
        )}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        contentContainerStyle={
          (!invitations || invitations.length === 0) && !isLoading
            ? styles.listEmpty
            : styles.list
        }
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
        ListFooterComponent={
          isLoading ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : null
        }
      />
    </SafeAreaView>
  );
}

export default memo(InvitationsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
  listEmpty: { flex: 1 },
  loader: { marginVertical: 24 },
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
  cardBody: { flex: 1, marginLeft: 12 },
  groupName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: Colors.primary },
  acceptBtnText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: '600' },
  declineBtn: { backgroundColor: Colors.borderLight },
  declineBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
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
});
