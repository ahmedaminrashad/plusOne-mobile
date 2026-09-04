import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useInputTextAlign } from '../../utils/rtl';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import ContactPickerModal from '../../components/common/ContactPickerModal';
import { PeopleIcon, ChevronLeftIcon, SearchIcon, CloseIcon, AddPersonIcon } from '../../components/icons';
import { useGetMyCircleQuery, useAddFriendMutation, useRemoveFriendMutation, useShareFriendInviteMutation, Friend } from '../../store/api/friendsApi';
import { DeviceContact, requestContactsPermission } from '../../utils/contacts';
import { formatPhone } from '../../utils/validation';
import { sharePlainText } from '../../utils/shareSheet';
import { isGhostFriend } from '../../utils/ghost';
import { resolveAssetUrl } from '../../utils/format';

type Props = AppScreenProps<'MyCircle'>;

function MyCircleScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const inputAlign = useInputTextAlign();
  const { data: circle, isLoading } = useGetMyCircleQuery();
  const [addFriend, { isLoading: isAdding }] = useAddFriendMutation();
  const [removeFriend] = useRemoveFriendMutation();
  const [shareInvite] = useShareFriendInviteMutation();

  const [query, setQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  const friendName = (f: Friend) => f.friend?.displayName ?? f.displayName ?? f.pendingPhone ?? '';

  const filtered = useMemo(() => {
    const list = circle ?? [];
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((f) => friendName(f).toLowerCase().includes(q) || (f.pendingPhone ?? '').includes(q));
  }, [circle, query]);

  const active = filtered.filter((f) => f.status === 'active');
  const pending = filtered.filter((f) => f.status === 'pending');
  const members = [...active, ...pending];

  const circlePhones = useMemo(() => {
    const set = new Set<string>();
    for (const f of circle ?? []) {
      const raw = f.friend?.phone ?? f.pendingPhone;
      if (raw) set.add(formatPhone(raw));
    }
    return [...set];
  }, [circle]);

  const handleAdd = useCallback(async () => {
    const phone = newPhone.trim();
    if (!phone) return;
    try {
      const result = await addFriend({ phone: formatPhone(phone) }).unwrap();
      setNewPhone('');
      setAddModalVisible(false);
      if (result.shareText) await sharePlainText(result.shareText);
    } catch {
      Alert.alert(t('common:error'), t('myCircle.addFailed'));
    }
  }, [newPhone, addFriend, t]);

  const handleContactsPicked = useCallback(async (contacts: DeviceContact[]) => {
    setContactPickerOpen(false);
    let failed = 0;
    for (const contact of contacts) {
      try {
        const result = await addFriend({
          phone: contact.phone,
          displayName: contact.name,
        }).unwrap();
        if (result.shareText) await sharePlainText(result.shareText);
      } catch {
        failed += 1;
      }
    }
    if (failed > 0) {
      Alert.alert(t('common:error'), t('myCircle.addFailed'));
    }
  }, [addFriend, t]);

  const handleInviteContact = useCallback(async (contact: DeviceContact) => {
    try {
      const result = await addFriend({
        phone: contact.phone,
        displayName: contact.name,
      }).unwrap();
      if (result.shareText) await sharePlainText(result.shareText);
    } catch {
      Alert.alert(t('common:error'), t('myCircle.addFailed'));
    }
  }, [addFriend, t]);

  const handleAddRegisteredContact = useCallback(async (contact: DeviceContact) => {
    try {
      await addFriend({
        phone: contact.phone,
        displayName: contact.name,
      }).unwrap();
    } catch {
      Alert.alert(t('common:error'), t('myCircle.addFailed'));
    }
  }, [addFriend, t]);

  const handleResend = useCallback(async (friend: Friend) => {
    try {
      const result = await shareInvite(friend.id).unwrap();
      if (result.shareText) await sharePlainText(result.shareText);
    } catch {
      Alert.alert(t('common:error'), t('myCircle.resendFailed'));
    }
  }, [shareInvite, t]);

  const handleRemove = useCallback((friend: Friend) => {
    Alert.alert(
      t('myCircle.removeTitle'),
      t('myCircle.removeMessage', { name: friendName(friend) }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friend.id).unwrap();
            } catch {
              Alert.alert(t('common:error'), t('myCircle.removeFailed'));
            }
          },
        },
      ],
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeFriend, t]);

  const renderRow = (item: Friend) => (
    <View style={styles.row} key={item.id}>
      <Avatar
        name={friendName(item)}
        seed={item.friendUserId ?? item.id}
        size={28}
        style={styles.avatarBorder}
        ghost={isGhostFriend(item)}
        uri={resolveAssetUrl(item.friend?.photoUrl)}
      />
      <View style={styles.rowInfo}>
        <Text style={[typography.labelLarge, styles.rowName]}>{friendName(item)}</Text>
        {item.status === 'pending' && (
          <Text style={[typography.bodySmall, styles.pendingSubtitle]}>{t('myCircle.pendingBadge')}</Text>
        )}
      </View>
      {item.status === 'pending' && (
        <TouchableOpacity onPress={() => handleResend(item)} hitSlop={8} style={styles.resendBtn}>
          <Text style={[typography.labelSmall, styles.resendBtnText]}>
            {t('myCircle.sendInvite')}
          </Text>
        </TouchableOpacity>
      )}
      <View style={[styles.statusPill, item.status === 'active' ? styles.statusPillActive : styles.statusPillPending]}>
        <Text style={[typography.labelSmall, item.status === 'active' ? styles.statusPillActiveText : styles.statusPillPendingText]}>
          {item.status === 'active' ? t('myCircle.onPlusOne') : t('myCircle.pendingPill')}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={10} style={styles.removeBtn}>
        <CloseIcon size={14} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeScreen style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={[typography.headingLarge, styles.title]}>{t('navigation:appStack.myCircleTitle')}</Text>
          <Text style={[typography.bodySmall, styles.headerSubtitle]}>{t('myCircle.headerSubtitle')}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={[typography.labelMedium, styles.countPillText]}>{t('myCircle.peopleCount', { count: circle?.length ?? 0 })}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <SearchIcon size={16} color={Colors.textMuted} />
        <TextInput
          style={[typography.bodyMedium, styles.searchInput]}
          placeholder={t('myCircle.searchPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={styles.growCard}>
        <View style={styles.growIconWrap}>
          <AddPersonIcon size={16} color={Colors.textOnPrimary} />
        </View>
        <View style={styles.growInfo}>
          <Text style={[typography.labelLarge, styles.growTitle]}>{t('myCircle.growTitle')}</Text>
          <Text style={[typography.bodySmall, styles.growSubtitle]}>{t('myCircle.growSubtitle')}</Text>
        </View>
        <View style={styles.growActions}>
          <TouchableOpacity
            style={styles.growBtnOutline}
            onPress={async () => {
              const granted = await requestContactsPermission();
              if (granted) setContactPickerOpen(true);
            }}>
            <Text style={[typography.labelMedium, styles.growBtnOutlineText]}>
              {t('myCircle.fromContacts', { defaultValue: 'Contacts' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.growBtn} onPress={() => setAddModalVisible(true)}>
            <Text style={[typography.labelLarge, styles.growBtnText]}>{t('myCircle.addButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {members.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <PeopleIcon size={40} color={Colors.textMuted} />
          </View>
          <Text style={[typography.headingMedium, styles.emptyTitle]}>{t('myCircle.emptyTitle')}</Text>
          <Text style={[typography.bodyMedium, styles.emptySubtitle]}>{t('myCircle.emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={[
            { type: 'header' as const, label: t('myCircle.inCircleHeader') },
            ...members.map((f) => ({ type: 'row' as const, friend: f })),
          ]}
          keyExtractor={(item, idx) => (item.type === 'header' ? `h-${item.label}` : item.friend.id) + idx}
          contentContainerStyle={styles.list}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={[typography.labelMedium, styles.sectionHeader]}>{item.label}</Text>
            ) : (
              renderRow(item.friend)
            )
          }
        />
      )}

      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[typography.headingSmall, styles.modalTitle]}>{t('myCircle.addPhoneTitle')}</Text>
            <TextInput
              style={[typography.bodyLarge, styles.modalInput]}
              placeholder={t('myCircle.addPhonePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              textAlign={inputAlign}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button title={t('common:cancel')} variant="ghost" onPress={() => setAddModalVisible(false)} style={styles.modalBtn} />
              <Button title={t('myCircle.addButton')} loading={isAdding} onPress={handleAdd} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>

      <ContactPickerModal
        visible={contactPickerOpen}
        onClose={() => setContactPickerOpen(false)}
        onConfirm={handleContactsPicked}
        title={t('myCircle.fromContactsTitle', { defaultValue: 'Add from contacts' })}
        inviteMode
        alreadyInCircle={circlePhones}
        onInvite={handleInviteContact}
        onAddRegistered={handleAddRegisteredContact}
      />
    </SafeScreen>
  );
}

export default memo(MyCircleScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  titleBlock: { flex: 1 },
  title: { color: Colors.text },
  headerSubtitle: { color: Colors.textSecondary, marginTop: 2 },
  countPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.tint },
  countPillText: { color: Colors.primary },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    marginHorizontal: 16, marginTop: 8, paddingHorizontal: 16, height: 38, gap: 8,
  },
  searchInput: { flex: 1, color: Colors.text, padding: 0 },

  growCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.warningTint, borderRadius: Radius.xl,
    marginHorizontal: 16, marginTop: 14, padding: 14,
  },
  growIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  growInfo: { flex: 1 },
  growTitle: { color: Colors.text },
  growSubtitle: { color: Colors.warningDark, marginTop: 2 },
  growActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  growBtnOutline: {
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  growBtnOutlineText: { color: Colors.accent },
  growBtn: { backgroundColor: Colors.accent, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  growBtnText: { color: Colors.textOnPrimary },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { marginBottom: 8 },
  emptyTitle: { color: Colors.text },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24 },
  sectionHeader: { color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 12, marginBottom: 8,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  avatarBorder: { borderWidth: 2, borderColor: Colors.surface },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.text },
  pendingSubtitle: { color: Colors.textSecondary, marginTop: 2 },
  resendBtn: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  resendBtnText: { color: Colors.accent },
  statusPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillActive: { backgroundColor: Colors.successTint },
  statusPillActiveText: { color: Colors.secondaryDark },
  statusPillPending: { backgroundColor: Colors.warningTint },
  statusPillPendingText: { color: Colors.warningDark },
  removeBtn: { marginLeft: 2, padding: 6 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: { color: Colors.text, marginBottom: 14 },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, color: Colors.text,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, height: 44 },
});
