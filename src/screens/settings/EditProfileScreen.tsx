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
import { useTranslation } from 'react-i18next';
import { SettingsScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useGetMeQuery, useUpdateProfileMutation, useUploadProfilePhotoMutation } from '../../store/api/usersApi';
import { resolveAssetUrl } from '../../utils/format';

type Props = SettingsScreenProps<'EditProfile'>;

function EditProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation('settings');
  const { data: me } = useGetMeQuery();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [uploadProfilePhoto] = useUploadProfilePhotoMutation();

  const [displayName, setDisplayName] = useState(me?.displayName ?? '');
  const [instaPayAlias, setInstaPayAlias] = useState(route.params?.prefillInstaPayAlias ?? me?.instaPayAlias ?? '');
  // Only set when the user picks a new photo this session — a local picker URI, as
  // opposed to `me?.photoUrl` which is a server-relative path. Keeping them separate
  // means the existing photo is resolved for display but never re-sent unless changed.
  const [newPhotoUri, setNewPhotoUri] = useState<string | undefined>();
  const [nameError, setNameError] = useState('');

  const displayPhotoUri = newPhotoUri ?? resolveAssetUrl(me?.photoUrl) ?? undefined;

  const handlePickPhoto = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.assets?.[0]?.uri) setNewPhotoUri(res.assets[0].uri);
    });
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = displayName.trim();
    if (!trimmed) { setNameError(t('editProfile.nameRequired')); return; }
    if (trimmed.length > 50) { setNameError(t('editProfile.nameTooLong')); return; }
    setNameError('');
    try {
      await updateProfile({
        displayName: trimmed,
        instaPayAlias: instaPayAlias.trim() || undefined,
      }).unwrap();
      if (newPhotoUri) await uploadProfilePhoto({ uri: newPhotoUri }).catch(() => {});
      navigation.goBack();
    } catch {
      Alert.alert(t('common:error'), t('editProfile.saveError'));
    }
  }, [displayName, instaPayAlias, newPhotoUri, updateProfile, uploadProfilePhoto, navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.header}>
        <View style={styles.deco1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('editProfile.backButton')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editProfile.headerTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickPhoto} activeOpacity={0.8}>
          <View style={styles.avatarRing}>
            <Avatar uri={displayPhotoUri} name={displayName || 'U'} size={80} />
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeIcon}>📷</Text>
            </View>
          </View>
          <Text style={styles.changePhotoText}>{t('editProfile.changePhoto')}</Text>
        </TouchableOpacity>

        {/* Phone (read-only) */}
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>{t('editProfile.phoneLabel')}</Text>
          <Text style={styles.readOnlyValue}>{me?.phone ?? '—'}</Text>
        </View>

        <Input
          label={t('editProfile.fullNameLabel')}
          value={displayName}
          onChangeText={(v) => { setDisplayName(v); setNameError(''); }}
          placeholder={t('editProfile.fullNamePlaceholder')}
          error={nameError}
          maxLength={50}
        />

        <Input
          label={t('editProfile.instaPayLabel')}
          value={instaPayAlias}
          onChangeText={setInstaPayAlias}
          placeholder={t('editProfile.instaPayPlaceholder')}
          maxLength={60}
        />

        <Button
          title={t('editProfile.saveButton')}
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
