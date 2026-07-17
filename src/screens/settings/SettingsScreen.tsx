import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SettingsScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import Avatar from '../../components/common/Avatar';
import { useGetMeQuery, useSaveLanguageMutation } from '../../store/api/usersApi';
import { useLogoutMutation } from '../../store/api/authApi';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { clearAuth } from '../../store/slices/authSlice';
import { baseApi } from '../../store/api/baseApi';
import { SecureStorage } from '../../utils/storage';
import { changeLanguage, AppLanguage } from '../../i18n';
import { resolveAssetUrl } from '../../utils/format';

type Props = SettingsScreenProps<'Settings'>;

interface SettingsRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
  value?: string;
}

function SettingsRow({ icon, label, onPress, danger, chevron = true, value }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {chevron && <Text style={[styles.rowChevron, danger && styles.rowChevronDanger]}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const LANGUAGE_LABELS: Record<AppLanguage, string> = { ar: 'العربية', en: 'English' };

function SettingsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const { data: me } = useGetMeQuery();
  const [languagePickerVisible, setLanguagePickerVisible] = useState(false);
  const currentLanguage = i18n.language as AppLanguage;
  const [saveLanguage] = useSaveLanguageMutation();
  const [logout] = useLogoutMutation();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  // Keep the backend in sync with the client's language — needed so push notifications
  // (generated server-side) are sent in the right language. Runs once per screen visit,
  // covering users who picked a language before this backend field existed.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    saveLanguage(currentLanguage).catch(() => {});
  }, [currentLanguage, saveLanguage]);

  const handleSelectLanguage = useCallback((language: AppLanguage) => {
    setLanguagePickerVisible(false);
    saveLanguage(language).catch(() => {});
    if (language !== currentLanguage) changeLanguage(language);
  }, [currentLanguage, saveLanguage]);

  const handleLogout = useCallback(() => {
    Alert.alert(t('settings.logoutLabel'), t('settings.logoutConfirmMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('settings.logoutConfirmButton'),
        style: 'destructive',
        onPress: async () => {
          if (refreshToken) await logout({ refreshToken }).catch(() => {});
          await SecureStorage.clearTokens();
          dispatch(baseApi.util.resetApiState());
          dispatch(clearAuth());
        },
      },
    ]);
  }, [dispatch, t, logout, refreshToken]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.deco1} />
        <View style={styles.deco2} />
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.85}>
          <Avatar uri={resolveAssetUrl(me?.photoUrl)} name={me?.displayName ?? 'U'} size={60} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{me?.displayName ?? '—'}</Text>
            <Text style={styles.profilePhone}>{me?.phone ?? ''}</Text>
          </View>
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>{t('common:edit')}</Text>
          </View>
        </TouchableOpacity>

        <SettingsSection title={t('settings.accountSection')}>
          <SettingsRow icon="👤" label={t('settings.editProfileLabel')} onPress={() => navigation.navigate('EditProfile')} />
          <View style={styles.divider} />
          <SettingsRow icon="💳" label={t('settings.paymentMethodsLabel')} onPress={() => navigation.navigate('PaymentMethods')} />
        </SettingsSection>

        <SettingsSection title={t('settings.securitySection')}>
          <SettingsRow icon="🔒" label={t('settings.securityLabel')} onPress={() => navigation.navigate('SecuritySettings')} />
        </SettingsSection>

        <SettingsSection title={t('settings.appSection')}>
          <SettingsRow
            icon="🌐"
            label={t('settings.languageLabel')}
            value={LANGUAGE_LABELS[currentLanguage]}
            onPress={() => setLanguagePickerVisible(true)}
          />
          <View style={styles.divider} />
          <SettingsRow icon="❓" label={t('settings.helpSupportLabel')} onPress={() => {}} />
          <View style={styles.divider} />
          <SettingsRow icon="ℹ️" label={t('settings.aboutLabel')} value="v1.0.0" onPress={() => {}} />
        </SettingsSection>

        <SettingsSection title="">
          <SettingsRow icon="🚪" label={t('settings.logoutLabel')} onPress={handleLogout} danger chevron={false} />
        </SettingsSection>

      </ScrollView>

      <Modal
        visible={languagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguagePickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLanguagePickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('settings.languageLabel')}</Text>
            {(Object.keys(LANGUAGE_LABELS) as AppLanguage[]).map((language) => {
              const selected = language === currentLanguage;
              return (
                <TouchableOpacity
                  key={language}
                  style={[styles.languageRow, selected && styles.languageRowSelected]}
                  onPress={() => handleSelectLanguage(language)}>
                  <Text style={[styles.languageRowText, selected && styles.languageRowTextSelected]}>
                    {LANGUAGE_LABELS[language]}
                  </Text>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default memo(SettingsScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -50, right: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  deco2: {
    position: 'absolute', bottom: -30, left: -40,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },

  scroll: { padding: 16, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  profilePhone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  editBadge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  editBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.secondary },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  rowIconDanger: { backgroundColor: Colors.danger + '15' },
  rowIconText: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  rowLabelDanger: { color: Colors.danger },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontSize: 13, color: Colors.textMuted },
  rowChevron: { fontSize: 20, color: Colors.textMuted, marginLeft: 2 },
  rowChevronDanger: { color: Colors.danger },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 62 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  languageRowSelected: { backgroundColor: Colors.primary + '10' },
  languageRowText: { flex: 1, fontSize: 16, color: Colors.text, textAlign: 'right' },
  languageRowTextSelected: { color: Colors.primary, fontWeight: '600' },
  checkmark: { fontSize: 18, color: Colors.primary, marginLeft: 8 },
});
