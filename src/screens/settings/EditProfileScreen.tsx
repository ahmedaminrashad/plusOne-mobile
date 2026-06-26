import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SettingsScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useGetMeQuery, useUpdateProfileMutation } from '../../store/api/usersApi';

type Props = SettingsScreenProps<'EditProfile'>;

function EditProfileScreen({ navigation }: Props) {
  const { data: me } = useGetMeQuery();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [displayName, setDisplayName] = useState(me?.displayName ?? '');
  const [instaPayAlias, setInstaPayAlias] = useState(me?.instaPayAlias ?? '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(me?.photoUrl ?? undefined);
  const [nameError, setNameError] = useState('');

  const handlePickPhoto = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
    });
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = displayName.trim();
    if (!trimmed) { setNameError('الاسم مطلوب'); return; }
    if (trimmed.length > 50) { setNameError('الاسم طويل جداً'); return; }
    setNameError('');
    try {
      await updateProfile({
        displayName: trimmed,
        instaPayAlias: instaPayAlias.trim() || undefined,
        photoUrl: photoUri,
      }).unwrap();
      navigation.goBack();
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ التغييرات، حاول مرة أخرى.');
    }
  }, [displayName, instaPayAlias, photoUri, updateProfile, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.header}>
        <View style={styles.deco1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تعديل الملف الشخصي</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickPhoto} activeOpacity={0.8}>
          <View style={styles.avatarRing}>
            <Avatar uri={photoUri} name={displayName || 'U'} size={80} />
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeIcon}>📷</Text>
            </View>
          </View>
          <Text style={styles.changePhotoText}>تغيير الصورة</Text>
        </TouchableOpacity>

        {/* Phone (read-only) */}
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>رقم الجوال</Text>
          <Text style={styles.readOnlyValue}>{me?.phone ?? '—'}</Text>
        </View>

        <Input
          label="الاسم الكامل *"
          value={displayName}
          onChangeText={(v) => { setDisplayName(v); setNameError(''); }}
          placeholder="اسمك الكامل"
          error={nameError}
          maxLength={50}
        />

        <Input
          label="معرّف InstaPay (اختياري)"
          value={instaPayAlias}
          onChangeText={setInstaPayAlias}
          placeholder="مثال: ahmed_hassan"
          maxLength={60}
        />

        <Button
          title="حفظ التغييرات"
          onPress={handleSave}
          loading={isLoading}
          disabled={!displayName.trim()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(EditProfileScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -40, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { color: Colors.secondary, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

  scroll: { padding: 24 },

  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 10 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2.5, borderColor: Colors.secondary + '70',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  cameraBadgeIcon: { fontSize: 14 },
  changePhotoText: { fontSize: 13, color: Colors.secondary, fontWeight: '600' },

  readOnlyField: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readOnlyLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4, fontWeight: '500' },
  readOnlyValue: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
});
