import React, { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import { useGetGroupMembersQuery, useRemoveMemberMutation } from '../../store/api/groupsApi';
import { useGetGroupBillsQuery, useDeleteBillMutation } from '../../store/api/billsApi';
import { GroupMember, MemberRole, Bill } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { useGetMeQuery } from '../../store/api/usersApi';
import { formatDate } from '../../utils/format';
import GroupChatPane from './GroupChatPane';

type Props = AppScreenProps<'GroupDetail'>;
type Tab = 'chat' | 'bills' | 'members';

// ──────────────────────────────────────────────────────────────
// Member row
// ──────────────────────────────────────────────────────────────

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
  const { t } = useTranslation('groups');
  const name = member.user?.displayName ?? member.pendingPhone ?? t('groupDetail.defaultUserName');
  const isPending = member.status === 'pending';
  return (
    <View style={styles.memberRow}>
      <Avatar uri={member.user?.photoUrl} name={name} size={42} />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{name}</Text>
          {member.role === 'admin' && (
            <View style={styles.adminBadge}><Text style={styles.adminText}>{t('groupDetail.roleAdmin')}</Text></View>
          )}
          {isPending && (
            <View style={styles.pendingBadge}><Text style={styles.pendingText}>{t('groupDetail.statusPending')}</Text></View>
          )}
        </View>
        <Text style={styles.memberPhone}>{member.user?.phone ?? member.pendingPhone ?? ''}</Text>
      </View>
      {isAdmin && !isSelf && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeText}>{t('groupDetail.removeAction')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Bill card
// ──────────────────────────────────────────────────────────────

function BillCard({
  bill,
  onPress,
  onDelete,
  canDelete,
}: {
  bill: Bill;
  onPress: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { t } = useTranslation('groups');
  const payerName = bill.paidBy?.displayName ?? t('groupDetail.defaultUserName');
  const date = formatDate(new Date(bill.createdAt), { day: 'numeric', month: 'short' });
  const displayName = bill.venueName ?? bill.title ?? t('groupDetail.defaultBillName');
  return (
    <TouchableOpacity style={styles.billCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.billIcon}>
        <Text style={styles.billIconText}>🧾</Text>
      </View>
      <View style={styles.billInfo}>
        <Text style={styles.billTitle}>{displayName}</Text>
        <Text style={styles.billMeta}>{t('groupDetail.paidByMeta', { payer: payerName, date })}</Text>
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
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────────────────────

function GroupDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation('groups');
  const { groupId, groupName } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const { data: members, isLoading, refetch } = useGetGroupMembersQuery(groupId);
  const { data: bills, isLoading: billsLoading } = useGetGroupBillsQuery(groupId, {
    skip: activeTab !== 'bills',
  });
  const [removeMember] = useRemoveMemberMutation();
  const [deleteBill] = useDeleteBillMutation();
  const { data: me } = useGetMeQuery();

  const myMembership = members?.find((m) => m.userId === me?.id);
  const isAdmin = myMembership?.role === 'admin';

  // ── Bills actions ───────────────────────────────────────────

  const handleScanQR = useCallback(() => {
    navigation.navigate('QRScanner', { groupId, groupName });
  }, [groupId, groupName, navigation]);

  const handleScanOCR = useCallback(() => {
    navigation.navigate('OCRCapture', { groupId, groupName });
  }, [groupId, groupName, navigation]);

  const handleAddBill = useCallback(() => {
    navigation.navigate('AddBill', { groupId, groupName });
  }, [groupId, groupName, navigation]);

  const handleDeleteBill = useCallback(
    (bill: Bill) => {
      Alert.alert(
        t('groupDetail.deleteBillTitle'),
        t('groupDetail.deleteBillMessage', { name: bill.venueName ?? bill.title ?? t('groupDetail.thisBillFallback') }),
        [
          { text: t('common:cancel'), style: 'cancel' },
          {
            text: t('common:delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteBill(bill.id).unwrap();
              } catch {
                Alert.alert(t('common:error'), t('groupDetail.deleteBillError'));
              }
            },
          },
        ],
      );
    },
    [deleteBill, t],
  );

  const handleRemove = useCallback(
    (member: GroupMember) => {
      const name = member.user?.displayName ?? member.pendingPhone ?? t('groupDetail.thisMemberFallback');
      Alert.alert(
        t('groupDetail.removeMemberTitle'),
        t('groupDetail.removeMemberMessage', { name }),
        [
          { text: t('common:cancel'), style: 'cancel' },
          {
            text: t('groupDetail.removeAction'),
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMember({ groupId, memberId: member.id }).unwrap();
              } catch {
                Alert.alert(t('common:error'), t('groupDetail.removeMemberError'));
              }
            },
          },
        ],
      );
    },
    [groupId, removeMember, t],
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

  const isChatPending = myMembership?.status === 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

        {/* Tab bar */}
        <View style={styles.tabs}>
          {(['chat', 'bills', 'members'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'chat' ? t('groupDetail.tabChat') : tab === 'bills' ? t('groupDetail.tabBills') : t('groupDetail.tabMembers')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Chat tab ─────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <View style={styles.flex}>
            {isChatPending ? (
              <View style={styles.centered}>
                <Text style={styles.pendingChatText}>
                  {t('groupDetail.pendingChatNotice')}
                </Text>
              </View>
            ) : (
              <GroupChatPane groupId={groupId} groupName={groupName} navigation={navigation} />
            )}
          </View>
        )}

        {/* ── Bills tab ────────────────────────────────────── */}
        {activeTab === 'bills' && (
          <View style={styles.flex}>
            <View style={styles.billActions}>
              <TouchableOpacity style={styles.billActionBtn} onPress={handleScanQR} activeOpacity={0.8}>
                <Text style={styles.billActionIcon}>📷</Text>
                <Text style={styles.billActionText}>{t('groupDetail.scanQR')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.billActionBtn} onPress={handleScanOCR} activeOpacity={0.8}>
                <Text style={styles.billActionIcon}>🖨</Text>
                <Text style={styles.billActionText}>{t('groupDetail.scanReceipt')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billActionBtn, styles.billActionBtnPrimary]}
                onPress={handleAddBill}
                activeOpacity={0.8}>
                <Text style={styles.billActionIcon}>✏️</Text>
                <Text style={[styles.billActionText, styles.billActionTextPrimary]}>{t('groupDetail.manualEntry')}</Text>
              </TouchableOpacity>
            </View>

            {billsLoading ? (
              <ActivityIndicator color={Colors.primary} style={styles.loader} />
            ) : !bills?.length ? (
              <View style={styles.emptyBills}>
                <Text style={styles.emptyBillsIcon}>🧾</Text>
                <Text style={styles.emptyBillsTitle}>{t('groupDetail.emptyBillsTitle')}</Text>
                <Text style={styles.emptyBillsSubtitle}>{t('groupDetail.emptyBillsSubtitle')}</Text>
              </View>
            ) : (
              <FlatList
                data={bills}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                  <BillCard
                    bill={item}
                    canDelete={item.paidByUserId === me?.id || isAdmin}
                    onPress={() => navigation.navigate('ViewReceipt', { groupId, groupName, billId: item.id })}
                    onDelete={() => handleDeleteBill(item)}
                  />
                )}
                contentContainerStyle={styles.list}
              />
            )}
          </View>
        )}

        {/* ── Members tab ──────────────────────────────────── */}
        {activeTab === 'members' && (
          <View style={styles.flex}>
            {isAdmin && (
              <Button
                title={t('groupDetail.inviteMembersCta')}
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
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(GroupDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  // Chat
  pendingChatText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  // Bills
  billActions: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 6 },
  billActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  billActionBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  billActionIcon: { fontSize: 14 },
  billActionText: { fontSize: 12, fontWeight: '600', color: Colors.text },
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
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billIconText: { fontSize: 20 },
  billInfo: { flex: 1 },
  billTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  billMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  billRight: { alignItems: 'flex-end', gap: 2 },
  billAmount: { fontSize: 15, fontWeight: '700', color: Colors.text },
  billCurrency: { fontSize: 10, color: Colors.textMuted },
  billDelete: { fontSize: 15, marginTop: 4 },

  emptyBills: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyBillsIcon: { fontSize: 48 },
  emptyBillsTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptyBillsSubtitle: { fontSize: 13, color: Colors.textSecondary },

  // Members
  inviteBtn: { margin: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  loader: { marginTop: 40 },

  memberRow: {
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
});
