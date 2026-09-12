import React, { useState, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import { Colors } from '../../constants/colors';
import { isValidDisplayName } from '../../utils/validation';
import { useUpdateProfileMutation, useUploadProfilePhotoMutation } from '../../store/api/usersApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { setProfileComplete } from '../../store/slices/authSlice';
import { SecureStorage } from '../../utils/storage';
import { takeStashedInstaPayAlias, consumePendingSharedText } from '../../services/shareIntent';
import { extractInstaPayIdentifierFromSharedText } from '../../utils/instapay';

type Props = AuthScreenProps<'ProfileSetup'>;

function ProfileSetupScreen({ route }: Props) {
  const { t } = useTranslation('auth');
  const dispatch = useAppDispatch();
  const [displayName, setDisplayName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [instaPayAlias, setInstaPayAlias] = useState(
    () => route.params?.prefillInstaPayAlias ?? takeStashedInstaPayAlias() ?? '',
  );
  const [errors, setErrors] = useState<{ displayName?: string }>({});
  const [instaPayHelpVisible, setInstaPayHelpVisible] = useState(false);

  useEffect(() => {
    const fromRoute = route.params?.prefillInstaPayAlias;
    if (fromRoute) {
      setInstaPayAlias(fromRoute);
      setInstaPayHelpVisible(false);
    }
  }, [route.params?.prefillInstaPayAlias]);

  useEffect(() => {
    const fill = (alias: string) => {
      setInstaPayAlias(alias);
      setInstaPayHelpVisible(false);
    };
    const applyShare = async () => {
      const stashed = takeStashedInstaPayAlias();
      if (stashed) {
        fill(stashed);
        return;
      }
      const text = await consumePendingSharedText();
      if (!text) return;
      const identifier = extractInstaPayIdentifierFromSharedText(text);
      if (identifier) fill(identifier);
    };
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void applyShare();
    });
    return () => sub.remove();
  }, []);

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [uploadProfilePhoto] = useUploadProfilePhotoMutation();

  const validate = useCallback(() => {
    const next: typeof errors = {};
    if (!isValidDisplayName(displayName)) {
      next.displayName = t('profileSetup.nameLengthError');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [displayName, t]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    try {
      await updateProfile({
        displayName,
        instaPayAlias: instaPayAlias.trim() || undefined,
      }).unwrap();
      // photoUrl here is always a local picker URI (this screen only runs once, for
      // first-time setup) — upload it to get a server-resolvable path rather than
      // storing the local path directly, or the photo would only load on this device.
      if (photoUrl) await uploadProfilePhoto({ uri: photoUrl }).catch(() => {});
      const stored = await SecureStorage.getTokens();
      if (stored) await SecureStorage.saveTokens(stored.accessToken, stored.refreshToken, true);
      dispatch(setProfileComplete(true));
    } catch {
      Alert.alert(t('common:error'), t('profileSetup.saveFailedMessage'));
    }
  }, [validate, updateProfile, uploadProfilePhoto, displayName, photoUrl, instaPayAlias, dispatch, t]);

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
    <SafeScreen style={styles.container}>
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
          onChangeText={setInstaPayAlias}
          placeholder={t('profileSetup.instaPayPlaceholder')}
          maxLength={60}
        />
        <TouchableOpacity
          onPress={() => setInstaPayHelpVisible(true)}
          activeOpacity={0.7}
          style={styles.howToLinkBtn}
          hitSlop={8}>
          <Text style={styles.howToLink}>{t('profileSetup.instaPayHowToLink')}</Text>
        </TouchableOpacity>

        <Button title={t('profileSetup.saveButton')} onPress={handleSave} loading={isLoading} disabled={!displayName} style={styles.saveBtn} />

        <TouchableOpacity onPress={handleSave} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('profileSetup.skipButton')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={instaPayHelpVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInstaPayHelpVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInstaPayHelpVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('profileSetup.instaPayHowToTitle')}</Text>
            <Text style={styles.modalStep}>{t('profileSetup.instaPayHowToStep1')}</Text>
            <Text style={styles.modalStep}>{t('profileSetup.instaPayHowToStep2')}</Text>
            <Text style={styles.modalStep}>{t('profileSetup.instaPayHowToStep3')}</Text>
            <Text style={styles.modalStep}>{t('profileSetup.instaPayHowToStep4')}</Text>
            <Text style={styles.modalNote}>{t('profileSetup.instaPayHowToNote')}</Text>
            <Button title={t('common:done')} onPress={() => setInstaPayHelpVisible(false)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeScreen>
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
  howToLinkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginTop: -8,
    marginBottom: 16,
  },
  howToLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: { marginTop: 8 },
  skipBtn: { alignSelf: 'center', marginTop: 16, padding: 8 },
  skipText: { fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  modalStep: { fontSize: 17, color: Colors.text, lineHeight: 26 },
  modalNote: { fontSize: 15, color: Colors.textMuted, lineHeight: 22, marginVertical: 8 },
});
