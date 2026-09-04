import React, { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import ContactPickerModal from '../../components/common/ContactPickerModal';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { CloseIcon, PeopleIcon, PersonIcon } from '../../components/icons';
import { isValidPhone, formatPhone } from '../../utils/validation';
import { useGetGroupMembersQuery, useInviteMembersMutation } from '../../store/api/groupsApi';
import { useGetMyCircleQuery, Friend } from '../../store/api/friendsApi';
import { DeviceContact, requestContactsPermission } from '../../utils/contacts';
import { resolveAssetUrl } from '../../utils/format';
import { sharePlainText } from '../../utils/shareSheet';
import { isGhostFriend } from '../../utils/ghost';

type Props = AppScreenProps<'InviteMembers'>;

function InviteMembersScreen({ route, navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();
  const { groupId } = route.params;
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [circleOpen, setCircleOpen] = useState(false);

  const [inviteMembers, { isLoading }] = useInviteMembersMutation();
  const { data: members } = useGetGroupMembersQuery(groupId);
  const { data: circle } = useGetMyCircleQuery();

  const memberPhones = useMemo(() => {
    const set = new Set<string>();
    for (const m of members ?? []) {
      const raw = m.user?.phone ?? m.pendingPhone;
      if (raw) set.add(formatPhone(raw));
    }
    return set;
  }, [members]);

  const friendPhone = (f: Friend) => {
    const raw = f.friend?.phone ?? f.pendingPhone;
    return raw ? formatPhone(raw) : null;
  };
  const friendName = (f: Friend) => f.friend?.displayName ?? f.displayName ?? f.pendingPhone ?? '';

  const circleCandidates = useMemo(
    () =>
      (circle ?? []).filter((f) => {
        const p = friendPhone(f);
        return !!p && !memberPhones.has(p);
      }),
    [circle, memberPhones],
  );

  const handleAddPhone = useCallback(() => {
    const formatted = formatPhone(phone.trim());
    if (!isValidPhone(formatted)) {
      setPhoneError(t('inviteMembers.invalidPhone'));
      return;
    }
    if (selected.includes(formatted)) {
      setPhoneError(t('inviteMembers.phoneAlreadyAdded'));
      return;
    }
    setSelected((prev) => [...prev, formatted]);
    setPhone('');
    setPhoneError('');
  }, [phone, selected, t]);

  const handleRemovePhone = useCallback((p: string) => {
    setSelected((prev) => prev.filter((s) => s !== p));
    setContactNames((prev) => {
      const next = { ...prev };
      delete next[p];
      return next;
    });
  }, []);

  const handleAddCircleFriend = useCallback((friend: Friend) => {
    const formatted = friendPhone(friend);
    if (!formatted) return;
    setSelected((prev) => (prev.includes(formatted) ? prev : [...prev, formatted]));
    setContactNames((prev) => ({ ...prev, [formatted]: friendName(friend) }));
    setCircleOpen(false);
  }, []);

  const handleContactsPicked = useCallback((contacts: DeviceContact[]) => {
    setSelected((prev) => {
      const next = [...prev];
      for (const c of contacts) {
        if (!next.includes(c.phone)) next.push(c.phone);
      }
      return next;
    });
    setContactNames((prev) => {
      const next = { ...prev };
      for (const c of contacts) next[c.phone] = c.name;
      return next;
    });
    setPickerOpen(false);
  }, []);

  const handleSendInvites = useCallback(async () => {
    if (selected.length === 0) return;
    try {
      const names = selected.map((p) => contactNames[p] ?? '');
      const result = await inviteMembers({ groupId, phones: selected, names }).unwrap();
      for (const payload of result.sharePayloads ?? []) {
        if (payload.shareText) await sharePlainText(payload.shareText);
      }
      let message = t('inviteMembers.sentBase', { count: result.sent });
      if (result.failed > 0) {
        message += t('inviteMembers.sentFailedFragment', { count: result.failed });
      }
      if (result.alreadyMembers > 0) {
        message += t('inviteMembers.sentAlreadyMembersFragment', { count: result.alreadyMembers });
      }
      message += '.';
      Alert.alert(
        t('inviteMembers.sentTitle'),
        message,
        [{ text: t('inviteMembers.okButton'), onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert(t('common:error'), t('inviteMembers.sendError'));
    }
  }, [selected, contactNames, groupId, inviteMembers, navigation, t]);

  return (
    <SafeScreen style={styles.container} edges={[]}>
      <View style={styles.content}>
        <Text style={[typography.headingLarge, styles.title]}>{t('inviteMembers.title')}</Text>
        <Text style={[typography.bodyLarge, styles.subtitle]}>
          {t('inviteMembers.subtitle')}
        </Text>

        <TouchableOpacity
          style={styles.contactsBtn}
          onPress={async () => {
            const granted = await requestContactsPermission();
            if (granted) setPickerOpen(true);
          }}
          activeOpacity={0.8}>
          <PeopleIcon size={18} color={Colors.primary} />
          <Text style={[typography.labelLarge, styles.contactsBtnText]}>
            {t('inviteMembers.fromContacts', { defaultValue: 'Add from contacts' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactsBtn}
          onPress={() => setCircleOpen(true)}
          activeOpacity={0.8}>
          <PersonIcon size={18} color={Colors.primary} />
          <Text style={[typography.labelLarge, styles.contactsBtnText]}>
            {t('inviteMembers.fromCircle')}
          </Text>
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <Input
            value={phone}
            onChangeText={(v) => { setPhone(v); setPhoneError(''); }}
            placeholder={t('inviteMembers.phonePlaceholder')}
            keyboardType="phone-pad"
            error={phoneError}
            containerStyle={styles.phoneInput}
          />
          <Button
            title={t('common:add')}
            onPress={handleAddPhone}
            variant="outline"
            disabled={!phone.trim()}
            style={styles.addBtn}
          />
        </View>

        {selected.length > 0 && (
          <FlatList
            data={selected}
            keyExtractor={(p) => p}
            renderItem={({ item }) => (
              <View style={styles.phoneTag}>
                <Text style={[typography.labelMedium, styles.phoneTagText]} numberOfLines={1}>
                  {contactNames[item] ? `${contactNames[item]} · ${item}` : item}
                </Text>
                <TouchableOpacity onPress={() => handleRemovePhone(item)} hitSlop={8}>
                  <CloseIcon size={12} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tags}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title={`${t('inviteMembers.sendCta')} ${selected.length > 0 ? `(${selected.length})` : ''} ${t('inviteMembers.invitationsWord')}`}
          onPress={handleSendInvites}
          loading={isLoading}
          disabled={selected.length === 0}
        />
      </View>

      <ContactPickerModal
        visible={pickerOpen}
        alreadySelected={selected}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleContactsPicked}
      />

      <Modal visible={circleOpen} animationType="slide" onRequestClose={() => setCircleOpen(false)}>
        <SafeScreen style={styles.circleModal}>
          <View style={styles.circleHeader}>
            <Text style={[typography.headingMedium, styles.circleTitle]}>{t('inviteMembers.fromCircleTitle')}</Text>
            <TouchableOpacity onPress={() => setCircleOpen(false)} hitSlop={12} style={styles.closeBtn}>
              <CloseIcon size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {circleCandidates.length === 0 ? (
            <View style={styles.circleEmpty}>
              <Text style={[typography.bodyMedium, styles.circleEmptyText]}>{t('inviteMembers.fromCircleEmpty')}</Text>
            </View>
          ) : (
            <FlatList
              data={circleCandidates}
              keyExtractor={(f) => f.id}
              contentContainerStyle={styles.circleList}
              renderItem={({ item }) => {
                const phoneNumber = friendPhone(item);
                const already = !!phoneNumber && selected.includes(phoneNumber);
                return (
                  <TouchableOpacity
                    style={[styles.circleRow, already && styles.circleRowSelected]}
                    onPress={() => handleAddCircleFriend(item)}
                    disabled={already}
                    activeOpacity={0.75}>
                    <Avatar
                      uri={resolveAssetUrl(item.friend?.photoUrl)}
                      name={friendName(item)}
                      seed={item.friendUserId ?? item.id}
                      size={40}
                      ghost={isGhostFriend(item)}
                    />
                    <View style={styles.circleRowText}>
                      <Text style={[typography.labelLarge, styles.circleRowName]} numberOfLines={1}>
                        {friendName(item)}
                      </Text>
                      <Text style={[typography.bodySmall, styles.circleRowPhone]}>
                        {isGhostFriend(item)
                          ? `${t('groupDetail.statusInvited')} · ${phoneNumber}`
                          : phoneNumber}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeScreen>
      </Modal>
    </SafeScreen>
  );
}

export default memo(InviteMembersScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  title: { color: Colors.text, marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, marginBottom: 20 },
  contactsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.tint,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  contactsBtnText: { color: Colors.primary },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  phoneInput: { flex: 1, marginBottom: 0 },
  addBtn: { height: 52, paddingHorizontal: 16, marginTop: 0 },
  tags: { paddingVertical: 12, gap: 8 },
  phoneTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.tint,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    maxWidth: '100%',
  },
  phoneTagText: { color: Colors.primary },
  footer: { padding: 24, paddingTop: 0 },
  circleModal: { flex: 1, backgroundColor: Colors.background },
  circleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  circleTitle: { color: Colors.text, flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleEmpty: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  circleEmptyText: { color: Colors.textSecondary, textAlign: 'center' },
  circleList: { paddingHorizontal: 16, paddingBottom: 24 },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 12,
    marginBottom: 8,
  },
  circleRowSelected: { opacity: 0.45 },
  circleRowText: { flex: 1 },
  circleRowName: { color: Colors.text },
  circleRowPhone: { color: Colors.textSecondary, marginTop: 2 },
});
