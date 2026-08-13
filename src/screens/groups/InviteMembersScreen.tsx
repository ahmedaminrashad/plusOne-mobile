import React, { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ContactPickerModal from '../../components/common/ContactPickerModal';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { CloseIcon, PeopleIcon } from '../../components/icons';
import { isValidPhone, formatPhone } from '../../utils/validation';
import { useInviteMembersMutation } from '../../store/api/groupsApi';
import { DeviceContact, requestContactsPermission } from '../../utils/contacts';

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

  const [inviteMembers, { isLoading }] = useInviteMembersMutation();

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
      const result = await inviteMembers({ groupId, phones: selected }).unwrap();
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
  }, [selected, groupId, inviteMembers, navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
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
                <Text style={[typography.labelMedium, styles.phoneTagText]}>
                  {contactNames[item] ? `${contactNames[item]} · ${item}` : item}
                </Text>
                <TouchableOpacity onPress={() => handleRemovePhone(item)}>
                  <CloseIcon size={12} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
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
    </SafeAreaView>
  );
}

export default memo(InviteMembersScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 24 },
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  contactsBtnText: { color: Colors.primary },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  phoneInput: { flex: 1, marginBottom: 0 },
  addBtn: { height: 52, paddingHorizontal: 16, marginTop: 0 },
  tags: { paddingVertical: 8, gap: 8 },
  phoneTag: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.tint, borderRadius: Radius.xl,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  phoneTagText: { color: Colors.primary },
  footer: { padding: 24, paddingTop: 0 },
});
