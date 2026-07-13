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
import { launchImageLibrary } from 'react-native-image-picker';
import { AppScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import { Colors } from '../../constants/colors';
import { useCreateGroupMutation } from '../../store/api/groupsApi';
import { GroupCategory } from '../../types/models';

type Props = AppScreenProps<'CreateGroup'>;

function CreateGroupScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');

  const CATEGORIES: { key: GroupCategory; label: string }[] = [
    { key: 'friends', label: t('createGroup.categoryFriends') },
    { key: 'family', label: t('createGroup.categoryFamily') },
    { key: 'work', label: t('createGroup.categoryWork') },
    { key: 'travel', label: t('createGroup.categoryTravel') },
    { key: 'other', label: t('createGroup.categoryOther') },
  ];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<GroupCategory | undefined>();
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [nameError, setNameError] = useState('');

  const [createGroup, { isLoading }] = useCreateGroupMutation();

  const handlePickPhoto = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t('createGroup.nameRequired')); return; }
    if (trimmed.length > 50) { setNameError(t('createGroup.nameTooLong')); return; }
    setNameError('');

    try {
      const group = await createGroup({ name: trimmed, category, avatarUrl: avatarUri }).unwrap();
      navigation.replace('GroupDetail', { groupId: group.id, groupName: group.name });
    } catch {
      Alert.alert(t('common:error'), t('createGroup.createError'));
    }
  }, [name, category, avatarUri, createGroup, navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      {/* progress indicator */}
      <View style={styles.progress}>
        {[1, 2, 3].map((step) => (
          <View key={step} style={styles.progressStepWrap}>
            <View style={[styles.progressDot, step === 1 && styles.progressDotActive]} />
            {step < 3 && <View style={[styles.progressLine, step < 1 && styles.progressLineDone]} />}
          </View>
        ))}
        <Text style={styles.progressLabel}>{t('createGroup.stepLabel')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickPhoto} activeOpacity={0.8}>
          <View style={styles.avatarRing}>
            <Avatar uri={avatarUri} name={name || 'G'} size={80} />
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeIcon}>📷</Text>
            </View>
          </View>
          <Text style={styles.addPhotoText}>{avatarUri ? t('createGroup.changePhoto') : t('createGroup.addPhoto')}</Text>
        </TouchableOpacity>

        <Input
          label={t('createGroup.nameLabel')}
          value={name}
          onChangeText={(v) => { setName(v); setNameError(''); }}
          placeholder={t('createGroup.namePlaceholder')}
          error={nameError}
          maxLength={50}
          autoFocus
        />

        <Text style={styles.categoryLabel}>{t('createGroup.categoryLabel')}</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipSelected]}
              onPress={() => setCategory(category === c.key ? undefined : c.key)}
              activeOpacity={0.75}>
              <Text style={[styles.chipText, category === c.key && styles.chipTextSelected]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

  // progress
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 0,
  },
  progressStepWrap: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.secondary, width: 12, height: 12, borderRadius: 6 },
  progressLine: { width: 28, height: 2, backgroundColor: Colors.border, marginHorizontal: 2 },
  progressLineDone: { backgroundColor: Colors.secondary },
  progressLabel: {
    flex: 1, textAlign: 'right',
    fontSize: 12, color: Colors.textMuted, fontWeight: '500',
  },

  scroll: { padding: 24 },

  // avatar
  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 10 },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 2.5, borderColor: Colors.secondary + '60',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  cameraBadgeIcon: { fontSize: 13 },
  addPhotoText: { fontSize: 13, color: Colors.secondary, fontWeight: '600' },

  // category chips
  categoryLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '18',
  },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.accent, fontWeight: '700' },
});
