import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useInputTextAlign } from '../../utils/rtl';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import { useGetMyCircleQuery, useAddFriendMutation, useRemoveFriendMutation, Friend } from '../../store/api/friendsApi';

type Props = AppScreenProps<'MyCircle'>;

function MyCircleScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const inputAlign = useInputTextAlign();
  const { data: circle, isLoading } = useGetMyCircleQuery();
  const [addFriend, { isLoading: isAdding }] = useAddFriendMutation();
  const [removeFriend] = useRemoveFriendMutation();

  const [query, setQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
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

  const handleAdd = useCallback(async () => {
    const phone = newPhone.trim();
    if (!phone) return;
    try {
      await addFriend({ phone }).unwrap();
      setNewPhone('');
      setAddModalVisible(false);
    } catch {
      Alert.alert(t('common:error'), t('myCircle.addFailed'));
    }
  }, [newPhone, addFriend, t]);

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
      <Avatar name={friendName(item)} seed={item.friendUserId ?? item.id} size={28} style={styles.avatarBorder} />
      <View style={styles.rowInfo}>
        <Text style={[typography.labelLarge, styles.rowName]}>{friendName(item)}</Text>
        {item.status === 'pending' && (
          <Text style={[typography.bodySmall, styles.pendingSubtitle]}>{t('myCircle.pendingBadge')}</Text>
        )}
      </View>
      <View style={[styles.statusPill, item.status === 'active' ? styles.statusPillActive : styles.statusPillPending]}>
        <Text style={[typography.labelSmall, item.status === 'active' ? styles.statusPillActiveText : styles.statusPillPendingText]}>
          {item.status === 'active' ? t('myCircle.onPlusOne') : t('myCircle.pendingPill')}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={10} style={styles.removeBtn}>
        <Text style={styles.removeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.headingLarge, styles.back]}>‹</Text>
        </TouchableOpacity>
        <Text style={[typography.headingLarge, styles.title]}>{t('navigation:appStack.myCircleTitle')}</Text>
        <View style={styles.countPill}>
          <Text style={[typography.labelMedium, styles.countPillText]}>{t('myCircle.peopleCount', { count: circle?.length ?? 0 })}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
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
          <Text style={styles.growIcon}>🤝</Text>
        </View>
        <View style={styles.growInfo}>
          <Text style={[typography.labelLarge, styles.growTitle]}>{t('myCircle.growTitle')}</Text>
          <Text style={[typography.bodySmall, styles.growSubtitle]}>{t('myCircle.growSubtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.growBtn} onPress={() => setAddModalVisible(true)}>
          <Text style={[typography.labelLarge, styles.growBtnText]}>{t('myCircle.addButton')}</Text>
        </TouchableOpacity>
      </View>

      {members.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
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
    </SafeAreaView>
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
  back: { color: Colors.text },
  title: { color: Colors.text, flex: 1 },
  countPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.tint },
  countPillText: { color: Colors.primary },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    marginHorizontal: 16, marginTop: 8, paddingHorizontal: 16, height: 38, gap: 8,
  },
  searchIcon: { fontSize: 15 },
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
  growIcon: { fontSize: 14 },
  growInfo: { flex: 1 },
  growTitle: { color: Colors.text },
  growSubtitle: { color: Colors.warningDark, marginTop: 2 },
  growBtn: { backgroundColor: Colors.accent, borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 10 },
  growBtnText: { color: Colors.textOnPrimary },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
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
  statusPill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillActive: { backgroundColor: Colors.successTint },
  statusPillActiveText: { color: Colors.secondaryDark },
  statusPillPending: { backgroundColor: Colors.warningTint },
  statusPillPendingText: { color: Colors.warningDark },
  removeBtn: { marginLeft: 2 },
  removeIcon: { fontSize: 15, color: Colors.textMuted, padding: 6 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 20 },
  modalTitle: { color: Colors.text, marginBottom: 14 },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, color: Colors.text,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1 },
});
