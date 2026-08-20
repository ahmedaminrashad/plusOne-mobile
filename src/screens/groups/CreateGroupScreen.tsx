import React, { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { ChevronLeftIcon } from '../../components/icons';
import { useCreateGroupMutation } from '../../store/api/groupsApi';

type Props = AppScreenProps<'CreateGroup'>;

function CreateGroupScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const [createGroup, { isLoading }] = useCreateGroupMutation();

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t('createGroup.nameRequired')); return; }
    if (trimmed.length > 50) { setNameError(t('createGroup.nameTooLong')); return; }
    setNameError('');

    try {
      const group = await createGroup({ name: trimmed }).unwrap();
      navigation.replace('InviteMembers', { groupId: group.id });
    } catch {
      Alert.alert(t('common:error'), t('createGroup.createError'));
    }
  }, [name, createGroup, navigation, t]);

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[typography.headingMedium, styles.title]}>{t('navigation:appStack.createGroupTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input
          label={t('createGroup.nameLabel')}
          value={name}
          onChangeText={(v) => { setName(v); setNameError(''); }}
          placeholder={t('createGroup.namePlaceholder')}
          error={nameError}
          maxLength={50}
          autoFocus
        />

        <Button
          title={t('createGroup.nextCta')}
          onPress={handleCreate}
          loading={isLoading}
          disabled={!name.trim()}
        />
      </ScrollView>
    </SafeScreen>
  );
}

export default memo(CreateGroupScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 8, marginBottom: 14,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: Colors.text },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
});
