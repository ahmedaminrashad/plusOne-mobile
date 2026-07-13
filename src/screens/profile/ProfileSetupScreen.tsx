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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('auth');
  const dispatch = useAppDispatch();
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [instaPayAlias, setInstaPayAlias] = useState('');
  const [errors, setErrors] = useState<{ displayName?: string; instaPayAlias?: string }>({});

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const validate = useCallback(() => {
    const next: typeof errors = {};
    if (!isValidDisplayName(displayName)) {
      next.displayName = t('profileSetup.nameLengthError');
    }
    if (instaPayAlias && !isValidInstaPayAlias(instaPayAlias)) {
      next.instaPayAlias = t('profileSetup.instaPayError');
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
      Alert.alert(t('common:error'), t('profileSetup.saveFailedMessage'));
    }
  }, [validate, updateProfile, displayName, photoUrl, instaPayAlias, dispatch]);

  const handleAddPhoto = useCallback(() => {
    Alert.alert(t('profileSetup.addPhotoTitle'), t('profileSetup.addPhotoMessage'), [
      {
        text: t('profileSetup.cameraOption'),
        onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
          if (res.assets?.[0]?.uri) setPhotoUrl(res.assets[0].uri);
        }),
      },
      {
        text: t('profileSetup.galleryOption'),
        onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
          if (res.assets?.[0]?.uri) setPhotoUrl(res.assets[0].uri);
        }),
      },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  }, [t]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('profileSetup.title')}</Text>
        <Text style={styles.subtitle}>{t('profileSetup.subtitle')}</Text>

        <TouchableOpacity style={styles.avatarSection} onPress={handleAddPhoto}>
          <Avatar uri={photoUrl} name={displayName || '?'} size={88} />
          <Text style={styles.addPhotoText}>{photoUrl ? t('profileSetup.changePhoto') : t('profileSetup.addPhoto')}</Text>
        </TouchableOpacity>

        <Input
          label={t('profileSetup.nameLabel')}
          value={displayName}
          onChangeText={(v) => { setDisplayName(v); setErrors((e) => ({ ...e, displayName: undefined })); }}
          placeholder={t('profileSetup.namePlaceholder')}
          error={errors.displayName}
          maxLength={50}
          autoFocus
        />

        <Input
          label={t('profileSetup.instaPayLabel')}
          value={instaPayAlias}
          onChangeText={(v) => { setInstaPayAlias(v); setErrors((e) => ({ ...e, instaPayAlias: undefined })); }}
          placeholder={t('profileSetup.instaPayPlaceholder')}
          error={errors.instaPayAlias}
          maxLength={50}
        />
        <Text style={styles.instaHint}>
          {t('profileSetup.instaPayHint')}
        </Text>

        <Button title={t('profileSetup.saveButton')} onPress={handleSave} loading={isLoading} disabled={!displayName} style={styles.saveBtn} />

        <TouchableOpacity onPress={handleSave} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('profileSetup.skipButton')}</Text>
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
