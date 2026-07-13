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
import { Colors } from '../../constants/colors';
import { isValidPhone, formatPhone } from '../../utils/validation';
import { useInviteMembersMutation } from '../../store/api/groupsApi';

type Props = AppScreenProps<'InviteMembers'>;

function InviteMembersScreen({ route, navigation }: Props) {
  const { t } = useTranslation('groups');
  const { groupId } = route.params;
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

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
        <Text style={styles.title}>{t('inviteMembers.title')}</Text>
        <Text style={styles.subtitle}>
          {t('inviteMembers.subtitle')}
        </Text>

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
                <Text style={styles.phoneTagText}>{item}</Text>
                <TouchableOpacity onPress={() => handleRemovePhone(item)}>
                  <Text style={styles.removeTag}>✕</Text>
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
    </SafeAreaView>
  );
}

export default memo(InviteMembersScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  phoneInput: { flex: 1, marginBottom: 0 },
  addBtn: { height: 52, paddingHorizontal: 16, marginTop: 0 },
  tags: { paddingVertical: 8, gap: 8 },
  phoneTag: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight + '22', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  phoneTagText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  removeTag: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  footer: { padding: 24, paddingTop: 0 },
});
