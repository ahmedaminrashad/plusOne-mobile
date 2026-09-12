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
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import SafeScreen from '../../components/common/SafeScreen';
import { AppScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Avatar from '../../components/common/Avatar';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { CameraIcon, ChevronLeftIcon } from '../../components/icons';
import { useCreateGroupMutation, useUploadGroupAvatarMutation } from '../../store/api/groupsApi';

type Props = AppScreenProps<'CreateGroup'>;

function CreateGroupScreen({ navigation }: Props) {
  const { t } = useTranslation('groups');
  const typography = useTypography();

  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [nameError, setNameError] = useState('');

  const [createGroup, { isLoading }] = useCreateGroupMutation();
  const [uploadGroupAvatar] = useUploadGroupAvatarMutation();

  const handlePickPhoto = useCallback(() => {
    Alert.alert(t('createGroup.addPhoto'), t('auth:profileSetup.addPhotoMessage'), [
      {
        text: t('auth:profileSetup.cameraOption'),
        onPress: () => launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
          if (res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
        }),
      },
      {
        text: t('auth:profileSetup.galleryOption'),
        onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
          if (res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
        }),
      },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  }, [t]);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t('createGroup.nameRequired')); return; }
    if (trimmed.length > 50) { setNameError(t('createGroup.nameTooLong')); return; }
    setNameError('');

    try {
      const group = await createGroup({ name: trimmed }).unwrap();
      // Local picker URI must be uploaded — storing file:// breaks the photo for everyone else.
      if (avatarUri) {
        await uploadGroupAvatar({ groupId: group.id, uri: avatarUri }).catch(() => {});
      }
      navigation.replace('InviteMembers', { groupId: group.id });
    } catch {
      Alert.alert(t('common:error'), t('createGroup.createError'));
    }
  }, [name, avatarUri, createGroup, uploadGroupAvatar, navigation, t]);

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[typography.headingMedium, styles.title]}>{t('navigation:appStack.createGroupTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickPhoto} activeOpacity={0.8}>
          <View style={styles.avatarRing}>
            <Avatar uri={avatarUri} name={name || 'G'} size={80} />
            <View style={styles.cameraBadge}>
              <CameraIcon size={15} color={Colors.textOnPrimary} />
            </View>
          </View>
          <Text style={[typography.labelMedium, styles.addPhotoText]}>
            {avatarUri ? t('createGroup.changePhoto') : t('createGroup.addPhoto')}
          </Text>
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
  avatarSection: { alignItems: 'center', marginBottom: 12, gap: 10 },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  addPhotoText: { color: Colors.secondary },
});
