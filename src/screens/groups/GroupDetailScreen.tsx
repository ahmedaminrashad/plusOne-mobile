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
import { useGetGroupBillsQuery, useDeleteBillMutation } from '../../store/api/billsApi';
import { GroupMember, MemberRole, Bill } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
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

function BillCard({
  bill,
  onDelete,
  canDelete,
}: {
  bill: Bill;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const payerName = bill.paidBy?.displayName ?? 'مستخدم';
  const date = new Date(bill.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  return (
    <View style={styles.billCard}>
      <View style={styles.billIcon}>
        <Text style={styles.billIconText}>🧾</Text>
      </View>
      <View style={styles.billInfo}>
        <Text style={styles.billTitle}>{bill.title}</Text>
        <Text style={styles.billMeta}>دفع {payerName} • {date}</Text>
      </View>
      <View style={styles.billRight}>
        <Text style={styles.billAmount}>{Number(bill.amount).toFixed(2)}</Text>
        <Text style={styles.billCurrency}>{bill.currency}</Text>
        {canDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.billDelete}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('members');

  const { data: members, isLoading, refetch } = useGetGroupMembersQuery(groupId);
  const { data: bills, isLoading: billsLoading } = useGetGroupBillsQuery(groupId, { skip: activeTab !== 'bills' });
  const [removeMember] = useRemoveMemberMutation();
  const [deleteBill] = useDeleteBillMutation();
  const { data: me } = useGetMeQuery();

  const myMembership = members?.find((m) => m.userId === me?.id);
  const isAdmin = myMembership?.role === 'admin';

  const handleScanReceipt = useCallback(() => {
    navigation.navigate('QRScanner', { groupId, groupName: route.params.groupName });
  }, [groupId, navigation, route.params.groupName]);

  const handleAddBill = useCallback(() => {
    navigation.navigate('AddBill', { groupId, groupName: route.params.groupName });
  }, [groupId, navigation, route.params.groupName]);

  const handleDeleteBill = useCallback(
    (bill: Bill) => {
      Alert.alert('حذف الإيصال', `هل تريد حذف "${bill.title}"؟`, [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBill(bill.id).unwrap();
            } catch {
              Alert.alert('خطأ', 'تعذر حذف الإيصال');
            }
          },
        },
      ]);
    },
    [deleteBill],
  );

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
        <View style={styles.flex}>
          <View style={styles.billActions}>
            <TouchableOpacity style={styles.billActionBtn} onPress={handleScanReceipt} activeOpacity={0.8}>
              <Text style={styles.billActionIcon}>📷</Text>
              <Text style={styles.billActionText}>مسح إيصال</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.billActionBtn, styles.billActionBtnPrimary]} onPress={handleAddBill} activeOpacity={0.8}>
              <Text style={styles.billActionIcon}>✏️</Text>
              <Text style={[styles.billActionText, styles.billActionTextPrimary]}>إضافة يدوي</Text>
            </TouchableOpacity>
          </View>

          {billsLoading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : !bills?.length ? (
            <View style={styles.emptyBills}>
              <Text style={styles.emptyBillsIcon}>🧾</Text>
              <Text style={styles.emptyBillsTitle}>لا توجد إيصالات بعد</Text>
              <Text style={styles.emptyBillsSubtitle}>أضف أو امسح أول إيصال للمجموعة</Text>
            </View>
          ) : (
            <FlatList
              data={bills}
              keyExtractor={(b) => b.id}
              renderItem={({ item }) => (
                <BillCard
                  bill={item}
                  canDelete={item.paidByUserId === me?.id || isAdmin}
                  onDelete={() => handleDeleteBill(item)}
                />
              )}
              contentContainerStyle={styles.list}
            />
          )}
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
  flex: { flex: 1 },

  billActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 8,
  },
  billActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  billActionBtnPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  billActionIcon: { fontSize: 16 },
  billActionText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  billActionTextPrimary: { color: Colors.textOnPrimary },

  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  billIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billIconText: { fontSize: 22 },
  billInfo: { flex: 1 },
  billTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  billMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  billRight: { alignItems: 'flex-end', gap: 2 },
  billAmount: { fontSize: 16, fontWeight: '700', color: Colors.text },
  billCurrency: { fontSize: 11, color: Colors.textMuted },
  billDelete: { fontSize: 16, marginTop: 4 },

  emptyBills: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyBillsIcon: { fontSize: 52 },
  emptyBillsTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyBillsSubtitle: { fontSize: 14, color: Colors.textSecondary },
});
