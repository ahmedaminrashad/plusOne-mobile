import React, { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import {
  useGetGroupMembersQuery,
  useRemoveMemberMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} from '../../store/api/groupsApi';
import { useGetGroupBillsQuery, useDeleteBillMutation } from '../../store/api/billsApi';
import { useGetBillSharesQuery } from '../../store/api/sharesApi';
import { GroupMember, Bill } from '../../types/models';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useGetMeQuery } from '../../store/api/usersApi';
import { formatDate, formatCurrency, resolveAssetUrl } from '../../utils/format';
import GroupChatPane from './GroupChatPane';
import GroupLedgerScreen from './GroupLedgerScreen';
import { ChevronLeftIcon, TrashIcon, ReceiptIcon } from '../../components/icons';

type Props = AppScreenProps<'GroupDetail'>;
type Tab = 'chat' | 'bills' | 'ledger' | 'members';

const HEADER_AVATAR_COUNT = 3;

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
  const typography = useTypography();
  const name = member.user?.displayName ?? member.pendingPhone ?? t('groupDetail.defaultUserName');
  const isPending = member.status === 'pending';
  return (
    <View style={styles.memberRow}>
      <Avatar uri={resolveAssetUrl(member.user?.photoUrl)} name={name} seed={member.userId ?? member.id} size={42} />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[typography.labelLarge, styles.memberName]}>{name}</Text>
          {member.role === 'admin' && (
            <View style={styles.adminBadge}><Text style={[typography.labelSmall, styles.adminText]}>{t('groupDetail.roleAdmin')}</Text></View>
          )}
          {isPending && (
            <View style={styles.pendingBadge}><Text style={[typography.labelSmall, styles.pendingText]}>{t('groupDetail.statusPending')}</Text></View>
          )}
        </View>
        <Text style={[typography.bodySmall, styles.memberPhone]}>{member.user?.phone ?? member.pendingPhone ?? ''}</Text>
      </View>
      {isAdmin && !isSelf && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={[typography.labelMedium, styles.removeText]}>{t('groupDetail.removeAction')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Bill card — mirrors Figma's "Section - BILLS" card exactly:
// title / date+payer / amount, separator, then one of three real
// states derived from that bill's actual shares (never fabricated):
//   • no shares yet        → "Awaiting split" + "Split now"
//   • some shares pending  → "N of M paid" + pending badge + progress bar
//   • all shares settled   → "Fully settled ✓" + "M/M"
// ──────────────────────────────────────────────────────────────

function BillCard({
  bill,
  onPress,
  onSplit,
  onDelete,
  canDelete,
}: {
  bill: Bill;
  onPress: () => void;
  onSplit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { data: shares } = useGetBillSharesQuery(bill.id);

  const payerName = bill.paidBy?.displayName ?? t('groupDetail.defaultUserName');
  const date = formatDate(new Date(bill.createdAt), { day: 'numeric', month: 'short' });
  const displayName = bill.venueName ?? bill.title ?? t('groupDetail.defaultBillName');

  const activeShares = (shares ?? []).filter((s) => s.status !== 'cancelled');
  const settledCount = activeShares.filter((s) => s.status === 'settled').length;
  const totalCount = activeShares.length;
  const pendingCount = totalCount - settledCount;
  const allSettled = totalCount > 0 && pendingCount === 0;

  return (
    <TouchableOpacity style={styles.billCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.billTopRow}>
        <View style={styles.billInfo}>
          <Text style={[typography.headingSmall, styles.billTitle]} numberOfLines={1}>{displayName}</Text>
          <Text style={[typography.bodySmall, styles.billMeta]}>
            {t('groupDetail.paidByMeta', { payer: payerName, date })}
          </Text>
        </View>
        <View style={styles.billAmountBlock}>
          <Text style={[typography.amountMedium, styles.billAmount]}>{formatCurrency(Number(bill.amount), bill.currency)}</Text>
          <Text style={[typography.bodySmall, styles.billCurrency]}>{bill.currency}</Text>
        </View>
        {canDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.billDeleteBtn}>
            <TrashIcon size={16} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.billSeparator} />

      {totalCount === 0 ? (
        <View style={styles.billStatusRow}>
          <Text style={[typography.bodyMedium, styles.billStatusMuted]}>{t('groupDetail.awaitingSplit')}</Text>
          <TouchableOpacity style={styles.splitNowPill} onPress={onSplit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={[typography.labelMedium, styles.splitNowText]}>{t('groupDetail.splitNow')}</Text>
          </TouchableOpacity>
        </View>
      ) : allSettled ? (
        <View style={styles.billStatusRow}>
          <Text style={[typography.bodyMedium, styles.billSettledText]}>{t('groupDetail.fullySettled')}</Text>
          <Text style={[typography.bodyMedium, styles.billStatusMuted]}>{settledCount}/{totalCount}</Text>
        </View>
      ) : (
        <>
          <View style={styles.billStatusRow}>
            <Text style={[typography.bodyMedium, styles.billStatusMuted]}>
              {t('groupDetail.paidCount', { paid: settledCount, total: totalCount })}
            </Text>
            <View style={styles.billStatusRowRight}>
              {pendingCount > 0 && (
                <View style={styles.pendingCountBadge}>
                  <Text style={[typography.labelSmall, styles.pendingCountText]}>
                    {t('groupDetail.pendingCount', { count: pendingCount })}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.splitNowPill} onPress={onSplit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[typography.labelMedium, styles.splitNowText]}>{t('groupDetail.editSplit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(settledCount / totalCount) * 100}%` }]} />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────────────────────

function GroupDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { groupId, groupName: routeGroupName } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [displayName, setDisplayName] = useState(routeGroupName);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState(routeGroupName);

  const { data: members, isLoading, refetch } = useGetGroupMembersQuery(groupId, {
    pollingInterval: 10_000,
  });
  const { data: bills, isLoading: billsLoading } = useGetGroupBillsQuery(groupId, {
    skip: activeTab !== 'bills',
  });
  const [removeMember] = useRemoveMemberMutation();
  const [deleteBill] = useDeleteBillMutation();
  const [updateGroup, { isLoading: isRenaming }] = useUpdateGroupMutation();
  const [deleteGroup, { isLoading: isDeletingGroup }] = useDeleteGroupMutation();
  const { data: me } = useGetMeQuery();

  const activeMembers = useMemo(() => members?.filter((m) => m.status === 'active') ?? [], [members]);
  const myMembership = members?.find((m) => m.userId === me?.id);
  const isAdmin = myMembership?.role === 'admin';

  const headerAvatars = activeMembers.slice(0, HEADER_AVATAR_COUNT);
  const headerOverflow = activeMembers.length - headerAvatars.length;

  // ── Bills actions ───────────────────────────────────────────

  const handleAddBill = useCallback(() => {
    navigation.navigate('AddBillChooser', { groupId, groupName: displayName });
  }, [groupId, displayName, navigation]);

  const handleSplitBill = useCallback(
    (billId: string) => {
      navigation.navigate('EditBillItems', { groupId, groupName: displayName, billId });
    },
    [groupId, displayName, navigation],
  );

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

  const submitRename = useCallback(async (nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === displayName) {
      setRenameVisible(false);
      return;
    }
    try {
      const updated = await updateGroup({ groupId, name: trimmed }).unwrap();
      setDisplayName(updated.name);
      navigation.setParams({ groupName: updated.name });
      setRenameVisible(false);
    } catch {
      Alert.alert(t('common:error'), t('groupDetail.renameError'));
    }
  }, [displayName, updateGroup, groupId, navigation, t]);

  const handleRenamePress = useCallback(() => {
    if (!isAdmin) return;
    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('groupDetail.renameTitle'),
        undefined,
        [
          { text: t('common:cancel'), style: 'cancel' },
          { text: t('common:save', { defaultValue: 'Save' }), onPress: (text?: string) => { if (text) void submitRename(text); } },
        ],
        'plain-text',
        displayName,
      );
      return;
    }
    setRenameValue(displayName);
    setRenameVisible(true);
  }, [isAdmin, t, displayName, submitRename]);

  const handleDeleteGroup = useCallback(() => {
    Alert.alert(
      t('groupDetail.deleteGroupTitle'),
      t('groupDetail.deleteGroupMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('groupDetail.deleteGroupAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId).unwrap();
              navigation.navigate('Home');
            } catch (err: any) {
              const payload = err?.data?.message;
              const code =
                (typeof payload === 'string'
                  ? payload
                  : payload?.message ?? payload?.error) ??
                err?.data?.error ??
                '';
              Alert.alert(
                t('common:error'),
                code === 'GROUP_HAS_OPEN_SHARES'
                  ? t('groupDetail.deleteGroupHasOpenShares')
                  : t('groupDetail.deleteGroupError'),
              );
            }
          },
        },
      ],
    );
  }, [deleteGroup, groupId, navigation, t]);

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

  const TABS: Tab[] = ['chat', 'bills', 'ledger', 'members'];
  const tabLabel = (tab: Tab) =>
    tab === 'chat' ? t('groupDetail.tabChat')
      : tab === 'bills' ? t('groupDetail.tabBills')
      : tab === 'ledger' ? t('groupDetail.tabLedger')
      : t('groupDetail.tabMembers');

  return (
    <SafeScreen style={styles.container}>
        {/* Header — back button, group name + member count, avatar stack */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeftIcon size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerTitleBlock}
            onPress={handleRenamePress}
            disabled={!isAdmin}
            activeOpacity={isAdmin ? 0.7 : 1}>
            <Text style={[typography.headingSmall, styles.headerTitle]} numberOfLines={1}>{displayName}</Text>
            <Text style={[typography.bodySmall, styles.headerSubtitle]}>
              {t('home.activeMembersCount', { count: activeMembers.length })}
              {isAdmin ? ` · ${t('groupDetail.renameAction')}` : ''}
            </Text>
          </TouchableOpacity>
          <View style={styles.headerAvatarStack}>
            {headerAvatars.map((m, i) => (
              <Avatar
                key={m.id}
                uri={resolveAssetUrl(m.user?.photoUrl)}
                name={m.user?.displayName ?? t('groupDetail.defaultUserName')}
                seed={m.userId ?? m.id}
                size={28}
                style={[styles.headerAvatarItem, i > 0 && { marginLeft: -8 }]}
              />
            ))}
            {headerOverflow > 0 && (
              <View style={[styles.headerAvatarItem, styles.headerAvatarOverflow, { marginLeft: -8 }]}>
                <Text style={[typography.labelSmall, styles.headerAvatarOverflowText]}>+{headerOverflow}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Segmented tab control */}
        <View style={styles.segmentTrack}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.segment, activeTab === tab && styles.segmentActive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[typography.labelMedium, styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
                {tabLabel(tab)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Chat tab ─────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <View style={styles.flex}>
            {isChatPending ? (
              <View style={styles.centered}>
                <Text style={[typography.bodyMedium, styles.pendingChatText]}>
                  {t('groupDetail.pendingChatNotice')}
                </Text>
              </View>
            ) : (
              <GroupChatPane groupId={groupId} groupName={displayName} navigation={navigation} />
            )}
          </View>
        )}

        {/* ── Bills tab ────────────────────────────────────── */}
        {activeTab === 'bills' && (
          <View style={styles.flex}>
            {billsLoading ? (
              <ActivityIndicator color={Colors.primary} style={styles.loader} />
            ) : !bills?.length ? (
              <View style={styles.emptyBills}>
                <ReceiptIcon size={44} color={Colors.textMuted} />
                <Text style={[typography.headingMedium, styles.emptyBillsTitle]}>{t('groupDetail.emptyBillsTitle')}</Text>
                <Text style={[typography.bodyMedium, styles.emptyBillsSubtitle]}>{t('groupDetail.emptyBillsSubtitle')}</Text>
              </View>
            ) : (
              <FlatList
                data={bills}
                keyExtractor={(b) => b.id}
                renderItem={({ item }) => (
                  <BillCard
                    bill={item}
                    canDelete={item.paidByUserId === me?.id || isAdmin}
                    onPress={() => navigation.navigate('BillStatus', { groupId, groupName: displayName, billId: item.id })}
                    onSplit={() => handleSplitBill(item.id)}
                    onDelete={() => handleDeleteBill(item)}
                  />
                )}
                contentContainerStyle={styles.list}
              />
            )}
            <TouchableOpacity style={styles.addBillFab} onPress={handleAddBill} activeOpacity={0.85}>
              <Text style={[typography.labelLarge, styles.addBillFabText]}>{t('groupDetail.addBillCta')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tab (ledger) tab ─────────────────────────────── */}
        {activeTab === 'ledger' && <GroupLedgerScreen groupId={groupId} />}

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
                ListFooterComponent={
                  isAdmin ? (
                    <TouchableOpacity
                      style={styles.deleteGroupBtn}
                      onPress={handleDeleteGroup}
                      disabled={isDeletingGroup}
                      activeOpacity={0.75}>
                      <Text style={[typography.labelMedium, styles.deleteGroupText]}>
                        {t('groupDetail.deleteGroupAction')}
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        )}

      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <TouchableOpacity style={styles.renameOverlay} activeOpacity={1} onPress={() => setRenameVisible(false)}>
          <View style={styles.renameSheet}>
            <Text style={[typography.headingSmall, styles.renameTitle]}>{t('groupDetail.renameTitle')}</Text>
            <TextInput
              style={[typography.bodyLarge, styles.renameInput]}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t('groupDetail.renamePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              maxLength={50}
              autoFocus
            />
            <View style={styles.renameActions}>
              <TouchableOpacity style={styles.renameCancel} onPress={() => setRenameVisible(false)}>
                <Text style={[typography.labelMedium, styles.renameCancelText]}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.renameSave}
                onPress={() => void submitRename(renameValue)}
                disabled={isRenaming}>
                <Text style={[typography.labelMedium, styles.renameSaveText]}>
                  {t('common:save', { defaultValue: 'Save' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeScreen>
  );
}

export default memo(GroupDetailScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleBlock: { flex: 1 },
  headerTitle: { color: Colors.text },
  headerSubtitle: { color: Colors.textSecondary, marginTop: 2 },
  headerAvatarStack: { flexDirection: 'row', alignItems: 'center' },
  headerAvatarItem: { borderWidth: 2, borderColor: Colors.background },
  headerAvatarOverflow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.neutral200,
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarOverflowText: { color: Colors.textSecondary },

  // Segmented tab control
  segmentTrack: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.neutral200,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: { color: Colors.textSecondary },
  segmentTextActive: { color: Colors.primary },

  // Chat
  pendingChatText: { color: Colors.textSecondary, textAlign: 'center' },

  // Bills
  billCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  billTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  billInfo: { flex: 1 },
  billTitle: { color: Colors.text },
  billMeta: { color: Colors.textSecondary, marginTop: 3 },
  billAmountBlock: { alignItems: 'flex-end' },
  billAmount: { color: Colors.text },
  billCurrency: { color: Colors.textSecondary, marginTop: 1 },
  billDeleteBtn: { marginLeft: 8 },
  billSeparator: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  billStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billStatusRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billStatusMuted: { color: Colors.textSecondary },
  billSettledText: { color: Colors.success },
  pendingCountBadge: { backgroundColor: Colors.warningTint, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pendingCountText: { color: Colors.warningDark },
  splitNowPill: { backgroundColor: Colors.tint, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  splitNowText: { color: Colors.primary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surfaceElevated, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.success },

  addBillFab: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  addBillFabText: { color: Colors.textOnPrimary },

  emptyBills: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32 },
  emptyBillsTitle: { color: Colors.text },
  emptyBillsSubtitle: { color: Colors.textSecondary, textAlign: 'center' },

  // Members
  inviteBtn: { margin: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 90 },
  loader: { marginTop: 40 },
  deleteGroupBtn: {
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: Radius.xl,
    backgroundColor: Colors.dangerTint,
  },
  deleteGroupText: { color: Colors.danger },
  renameOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  renameSheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    gap: 12,
  },
  renameTitle: { color: Colors.text, textAlign: 'center' },
  renameInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  renameActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  renameCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.neutral100,
  },
  renameCancelText: { color: Colors.textSecondary },
  renameSave: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  renameSaveText: { color: Colors.textOnPrimary },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 8,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { color: Colors.text },
  memberPhone: { color: Colors.textMuted, marginTop: 2 },
  adminBadge: { backgroundColor: Colors.tint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  adminText: { color: Colors.primary },
  pendingBadge: { backgroundColor: Colors.warningTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  pendingText: { color: Colors.warningDark },
  removeBtn: { padding: 8 },
  removeText: { color: Colors.danger },
});
