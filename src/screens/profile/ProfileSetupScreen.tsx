import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import { Colors } from '../../constants/colors';
import { isValidDisplayName, isValidInstaPayAlias } from '../../utils/validation';
import { useUpdateProfileMutation } from '../../store/api/usersApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { setProfileComplete } from '../../store/slices/authSlice';
import { SecureStorage } from '../../utils/storage';

type Props = AuthScreenProps<'ProfileSetup'>;

function ProfileSetupScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [instaPayAlias, setInstaPayAlias] = useState('');
  const [errors, setErrors] = useState<{ displayName?: string; instaPayAlias?: string }>({});

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const validate = useCallback(() => {
    const next: typeof errors = {};
    if (!isValidDisplayName(displayName)) {
      next.displayName = 'يجب أن يكون الاسم بين 2 و 50 حرفاً';
    }
    if (instaPayAlias && !isValidInstaPayAlias(instaPayAlias)) {
      next.instaPayAlias = 'اسم InstaPay غير صحيح';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [displayName, instaPayAlias]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    try {
      await updateProfile({ displayName, photoUrl, instaPayAlias: instaPayAlias || undefined }).unwrap();
      const stored = await SecureStorage.getTokens();
      if (stored) await SecureStorage.saveTokens(stored.accessToken, stored.refreshToken, true);
      dispatch(setProfileComplete(true));
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الملف الشخصي، حاول مرة أخرى لاحقاً');
    }
  }, [validate, updateProfile, displayName, photoUrl, instaPayAlias, dispatch]);

  const handleAddPhoto = useCallback(() => {
    Alert.alert('إضافة صورة', 'اختر مصدر الصورة', [
      {
        text: 'الكاميرا',
        onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
          if (res.assets?.[0]?.uri) setPhotoUrl(res.assets[0].uri);
        }),
      },
      {
        text: 'معرض الصور',
        onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
          if (res.assets?.[0]?.uri) setPhotoUrl(res.assets[0].uri);
        }),
      },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>إعداد الملف الشخصي</Text>
        <Text style={styles.subtitle}>كيف تريد أن يعرّفك أصدقاؤك؟</Text>

        <TouchableOpacity style={styles.avatarSection} onPress={handleAddPhoto}>
          <Avatar uri={photoUrl} name={displayName || '?'} size={88} />
          <Text style={styles.addPhotoText}>{photoUrl ? 'تغيير الصورة' : 'إضافة صورة (اختياري)'}</Text>
        </TouchableOpacity>

        <Input
          label="الاسم المعروض *"
          value={displayName}
          onChangeText={(v) => { setDisplayName(v); setErrors((e) => ({ ...e, displayName: undefined })); }}
          placeholder="مثال: أحمد محمد"
          error={errors.displayName}
          maxLength={50}
          autoFocus
        />

        <Input
          label="اسم InstaPay (اختياري)"
          value={instaPayAlias}
          onChangeText={(v) => { setInstaPayAlias(v); setErrors((e) => ({ ...e, instaPayAlias: undefined })); }}
          placeholder="مثال: ahmed.pay"
          error={errors.instaPayAlias}
          maxLength={50}
        />
        <Text style={styles.instaHint}>
          سيستخدم أصدقاؤك هذا الاسم لتحويل حصتهم إليك عبر InstaPay
        </Text>

        <Button title="حفظ والمتابعة" onPress={handleSave} loading={isLoading} disabled={!displayName} style={styles.saveBtn} />

        <TouchableOpacity onPress={handleSave} style={styles.skipBtn}>
          <Text style={styles.skipText}>تخطي في الوقت الحالي</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(ProfileSetupScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 24, paddingTop: 32 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  avatarSection: { alignItems: 'center', marginBottom: 32, gap: 10 },
  addPhotoText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  instaHint: { fontSize: 12, color: Colors.textMuted, marginTop: -8, marginBottom: 24, lineHeight: 18 },
  saveBtn: { marginTop: 8 },
  skipBtn: { alignSelf: 'center', marginTop: 16, padding: 8 },
  skipText: { fontSize: 14, color: Colors.textSecondary },
});
