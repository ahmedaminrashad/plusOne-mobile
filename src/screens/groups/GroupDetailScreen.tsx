import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import { useGetGroupMembersQuery, useRemoveMemberMutation } from '../../store/api/groupsApi';
import { GroupMember, MemberRole } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { useGetMeQuery } from '../../store/api/usersApi';

type Props = AppScreenProps<'GroupDetail'>;
type Tab = 'members' | 'chat' | 'bills';

function MemberRow({
  member,
  isAdmin,
  isSelf,
  onRemove,
}: {
  member: GroupMember;
  isAdmin: boolean;
  isSelf: boolean;
  onRemove: () => void;
}) {
  const name = member.user?.displayName ?? member.pendingPhone ?? 'مستخدم';
  const isPending = member.status === 'pending';

  return (
    <View style={styles.memberRow}>
      <Avatar uri={member.user?.photoUrl} name={name} size={42} />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{name}</Text>
          {member.role === 'admin' && <View style={styles.adminBadge}><Text style={styles.adminText}>مسؤول</Text></View>}
          {isPending && <View style={styles.pendingBadge}><Text style={styles.pendingText}>قيد الانتظار</Text></View>}
        </View>
        <Text style={styles.memberPhone}>{member.user?.phone ?? member.pendingPhone ?? ''}</Text>
      </View>
      {isAdmin && !isSelf && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeText}>إزالة</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('members');

  const { data: members, isLoading, refetch } = useGetGroupMembersQuery(groupId);
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();
  const { data: me } = useGetMeQuery();

  const myMembership = members?.find((m) => m.userId === me?.id);
  const isAdmin = myMembership?.role === 'admin';

  const handleRemove = useCallback(
    (member: GroupMember) => {
      const name = member.user?.displayName ?? member.pendingPhone ?? 'هذا العضو';
      Alert.alert(
        'إزالة عضو',
        `هل تريد إزالة ${name} من المجموعة؟ ستظل سجلات الفواتير المرتبطة به مرئية.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إزالة',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember({ groupId, memberId: member.id }).unwrap();
              } catch {
                Alert.alert('خطأ', 'تعذر إزالة العضو، حاول مرة أخرى لاحقاً');
              }
            },
          },
        ],
      );
    },
    [groupId, removeMember],
  );

  const renderMember = useCallback(
    ({ item }: { item: GroupMember }) => (
      <MemberRow
        member={item}
        isAdmin={isAdmin}
        isSelf={item.userId === me?.id}
        onRemove={() => handleRemove(item)}
      />
    ),
    [isAdmin, me?.id, handleRemove],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        {(['members', 'chat', 'bills'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => {
              if (tab === 'chat') {
                navigation.navigate('Chat', { groupId, groupName: route.params.groupName });
              } else {
                setActiveTab(tab);
              }
            }}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'members' ? 'الأعضاء' : tab === 'chat' ? '💬 المحادثة' : 'الفواتير'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'members' && (
        <>
          {isAdmin && (
            <Button
              title="+ دعوة أعضاء"
              onPress={() => navigation.navigate('InviteMembers', { groupId })}
              variant="outline"
              style={styles.inviteBtn}
            />
          )}
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={members?.filter((m) => m.status !== 'removed') ?? []}
              keyExtractor={(m) => m.id}
              renderItem={renderMember}
              contentContainerStyle={styles.list}
            />
          )}
        </>
      )}

      {activeTab === 'bills' && (
        <View style={styles.emptyBills}>
          <Text style={styles.emptyBillsIcon}>🧾</Text>
          <Text style={styles.emptyBillsTitle}>لا توجد فواتير بعد</Text>
          <Text style={styles.emptyBillsSubtitle}>اضغط + لإضافة أول فاتورة</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default memo(GroupDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },
  inviteBtn: { margin: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1,
  },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  memberPhone: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  adminBadge: { backgroundColor: Colors.primaryLight + '33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  adminText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  pendingBadge: { backgroundColor: Colors.pending + '33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pendingText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  removeBtn: { padding: 8 },
  removeText: { fontSize: 13, color: Colors.danger, fontWeight: '500' },
  loader: { marginTop: 40 },
  emptyBills: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyBillsIcon: { fontSize: 52 },
  emptyBillsTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyBillsSubtitle: { fontSize: 14, color: Colors.textSecondary },
});
