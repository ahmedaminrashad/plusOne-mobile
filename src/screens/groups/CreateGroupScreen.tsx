import React, { useState, useCallback, memo } from 'react';
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

const CATEGORIES: { key: GroupCategory; label: string }[] = [
  { key: 'friends', label: '👫 أصدقاء' },
  { key: 'family', label: '👨‍👩‍👧 عائلة' },
  { key: 'work', label: '💼 عمل' },
  { key: 'travel', label: '✈️ سفر' },
  { key: 'other', label: '📦 أخرى' },
];

function CreateGroupScreen({ navigation }: Props) {
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
    if (!trimmed) { setNameError('اسم المجموعة مطلوب'); return; }
    if (trimmed.length > 50) { setNameError('اسم المجموعة طويل جداً (أقصى 50 حرف)'); return; }
    setNameError('');

    try {
      const group = await createGroup({ name: trimmed, category, avatarUrl: avatarUri }).unwrap();
      navigation.replace('GroupDetail', { groupId: group.id, groupName: group.name });
    } catch {
      Alert.alert('خطأ', 'تعذر إنشاء المجموعة، حاول مرة أخرى لاحقاً');
    }
  }, [name, category, avatarUri, createGroup, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickPhoto}>
          <Avatar uri={avatarUri} name={name || 'G'} size={80} />
          <Text style={styles.addPhotoText}>{avatarUri ? 'تغيير الصورة' : 'إضافة صورة (اختياري)'}</Text>
        </TouchableOpacity>

        <Input
          label="اسم المجموعة *"
          value={name}
          onChangeText={(v) => { setName(v); setNameError(''); }}
          placeholder="مثال: رحلة الجامعة"
          error={nameError}
          maxLength={50}
          autoFocus
        />

        <Text style={styles.categoryLabel}>الفئة (اختياري)</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chip, category === c.key && styles.chipSelected]}
              onPress={() => setCategory(category === c.key ? undefined : c.key)}>
              <Text style={[styles.chipText, category === c.key && styles.chipTextSelected]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="إنشاء المجموعة" onPress={handleCreate} loading={isLoading} disabled={!name.trim()} style={styles.createBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(CreateGroupScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 10 },
  addPhotoText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  categoryLabel: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '22' },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.primary },
  createBtn: {},
});
