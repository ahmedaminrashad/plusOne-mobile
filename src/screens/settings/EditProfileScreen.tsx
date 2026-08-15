import React, { useState, useCallback, memo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { launchImageLibrary } from 'react-native-image-picker';
import { useTranslation } from 'react-i18next';
import { SettingsScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useGetMeQuery, useUpdateProfileMutation, useUploadProfilePhotoMutation } from '../../store/api/usersApi';
import { resolveAssetUrl } from '../../utils/format';
import { CameraIcon, ChevronLeftIcon } from '../../components/icons';

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
  const [instaPayHelpVisible, setInstaPayHelpVisible] = useState(false);

  useEffect(() => {
    if (me?.displayName != null) setDisplayName(me.displayName);
  }, [me?.displayName]);

  useEffect(() => {
    if (route.params?.prefillInstaPayAlias) {
      setInstaPayAlias(route.params.prefillInstaPayAlias);
      return;
    }
    if (me?.instaPayAlias != null) setInstaPayAlias(me.instaPayAlias);
    else if (!route.params?.prefillInstaPayAlias) setInstaPayAlias('');
  }, [me?.instaPayAlias, route.params?.prefillInstaPayAlias]);

  const displayPhotoUri = newPhotoUri ?? resolveAssetUrl(me?.photoUrl) ?? undefined;
  const avatarName = (displayName.trim() || me?.displayName || 'U').trim();
  const avatarInitialSource = avatarName.split(/\s+/).find(Boolean) ?? 'U';

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
        instaPayAlias: instaPayAlias.trim() || null,
      }).unwrap();
      if (newPhotoUri) await uploadProfilePhoto({ uri: newPhotoUri }).catch(() => {});
      navigation.goBack();
    } catch {
      Alert.alert(t('common:error'), t('editProfile.saveError'));
    }
  }, [displayName, instaPayAlias, newPhotoUri, updateProfile, uploadProfilePhoto, navigation, t]);

  return (
    <SafeScreen style={styles.container} statusBarColor={Colors.primaryDark}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.header}>
        <View style={styles.deco1} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <ChevronLeftIcon size={20} color={Colors.secondary} />
            <Text style={styles.backBtnText}>{t('common:back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{t('editProfile.headerTitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickPhoto} activeOpacity={0.8}>
          <View style={styles.avatarRing}>
            <Avatar uri={displayPhotoUri} name={avatarInitialSource} size={80} />
            <View style={styles.cameraBadge}>
              <CameraIcon size={15} color={Colors.textOnPrimary} />
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
        <TouchableOpacity onPress={() => setInstaPayHelpVisible(true)} activeOpacity={0.7}>
          <Text style={styles.howToLink}>{t('editProfile.instaPayHowToLink')}</Text>
        </TouchableOpacity>

        <Button
          title={t('editProfile.saveButton')}
          onPress={handleSave}
          loading={isLoading}
          disabled={!displayName.trim()}
        />
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
            <Text style={styles.modalTitle}>{t('editProfile.instaPayHowToTitle')}</Text>
            <Text style={styles.modalStep}>{t('editProfile.instaPayHowToStep1')}</Text>
            <Text style={styles.modalStep}>{t('editProfile.instaPayHowToStep2')}</Text>
            <Text style={styles.modalStep}>{t('editProfile.instaPayHowToStep3')}</Text>
            <Text style={styles.modalStep}>{t('editProfile.instaPayHowToStep4')}</Text>
            <Text style={styles.modalNote}>{t('editProfile.instaPayHowToNote')}</Text>
            <Button title={t('common:done')} onPress={() => setInstaPayHelpVisible(false)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeScreen>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backBtnText: { color: Colors.secondary, fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff' },

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
  howToLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 20,
  },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  modalStep: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  modalNote: { fontSize: 13, color: Colors.textMuted, lineHeight: 20, marginVertical: 8 },
});
