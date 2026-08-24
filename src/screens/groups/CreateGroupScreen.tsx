import React, { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { ChevronLeftIcon } from '../../components/icons';
import { useCreateGroupMutation } from '../../store/api/groupsApi';
import { GroupCategory } from '../../types/models';

type Props = AppScreenProps<'CreateGroup'>;

function CreateGroupScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();

  const CATEGORIES: { key: GroupCategory; label: string }[] = [
    { key: 'friends', label: t('createGroup.categoryFriends') },
    { key: 'family', label: t('createGroup.categoryFamily') },
    { key: 'work', label: t('createGroup.categoryWork') },
    { key: 'travel', label: t('createGroup.categoryTravel') },
    { key: 'other', label: t('createGroup.categoryOther') },
  ];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GroupCategory | undefined>();
  const [nameError, setNameError] = useState('');

  const [createGroup, { isLoading }] = useCreateGroupMutation();

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t('createGroup.nameRequired')); return; }
    if (trimmed.length > 50) { setNameError(t('createGroup.nameTooLong')); return; }
    setNameError('');

    try {
      const group = await createGroup({ name: trimmed, category }).unwrap();
      navigation.replace('InviteMembers', { groupId: group.id });
    } catch {
      Alert.alert(t('common:error'), t('createGroup.createError'));
    }
  }, [name, category, createGroup, navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
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

        {false && <Text style={[typography.labelSmall, styles.categoryLabel]}>{t('createGroup.categoryLabel')}</Text>}
        {false && <View style={styles.grid}>
          {CATEGORIES.map((c) => {
            const selected = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => setCategory(selected ? undefined : c.key)}
                activeOpacity={0.75}>
                <Text style={[typography.labelSmall, selected ? styles.cardTextSelected : styles.cardText]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>}

        <Button
          title={t('createGroup.nextCta')}
          onPress={handleCreate}
          loading={isLoading}
          disabled={!name.trim()}
        />
      </ScrollView>
    </SafeAreaView>
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

  scroll: { padding: 16, paddingTop: 0 },

  // category grid — 3 rounded cards per row, matching Figma's category picker
  // (Background+Border, r=20, selected = surfaceElevated bg + primary border)
  categoryLabel: { color: Colors.textSecondary, marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  card: {
    width: '31%', height: 68, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  cardSelected: {
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.surfaceElevated,
  },
  cardText: { color: Colors.textSecondary, textAlign: 'center' },
  cardTextSelected: { color: Colors.primary, textAlign: 'center' },
});
