import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SettingsScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { IconProps, BellIcon, FingerprintIcon, ShieldLockIcon, PhoneIcon } from '../../components/icons';

type Props = SettingsScreenProps<'SecuritySettings'>;

interface ToggleRowProps {
  icon: React.ComponentType<IconProps>;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accentColor?: string;
}

function ToggleRow({ icon: Icon, title, subtitle, value, onToggle, accentColor }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: (accentColor ?? Colors.primary) + '18' }]}>
        <Icon size={18} color={accentColor ?? Colors.primary} />
      </View>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: accentColor ?? Colors.secondary }}
        thumbColor={Colors.surface}
      />
    </View>
  );
}

function SecurityScreen({ navigation }: Props) {
  const { t } = useTranslation('settings');
  const [biometrics, setBiometrics] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleBiometricsToggle = useCallback((v: boolean) => {
    if (v) {
      Alert.alert(
        t('security.enableBiometricsTitle'),
        t('security.enableBiometricsMessage'),
        [
          { text: t('security.cancelButton'), style: 'cancel' },
          { text: t('security.enableButton'), onPress: () => setBiometrics(true) },
        ],
      );
    } else {
      setBiometrics(false);
    }
  }, [t]);

  const score = biometrics && loginAlerts ? 8 : loginAlerts ? 5 : 3;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.header}>
        <View style={styles.deco1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('common:back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('security.headerTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreCard}>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreMax}>/10</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreLabel}>{t('security.securityScoreLabel')}</Text>
            <Text style={styles.scoreHint}>{t('security.securityScoreHint')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <ToggleRow
            icon={BellIcon}
            title={t('security.loginAlertsTitle')}
            subtitle={t('security.loginAlertsSubtitle')}
            value={loginAlerts}
            onToggle={setLoginAlerts}
            accentColor={Colors.secondary}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={FingerprintIcon}
            title={t('security.biometricsTitle')}
            subtitle={t('security.biometricsSubtitle')}
            value={biometrics}
            onToggle={handleBiometricsToggle}
            accentColor={Colors.accent}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={ShieldLockIcon}
            title={t('security.twoFactorTitle')}
            subtitle={t('security.twoFactorSubtitle')}
            value={twoFactor}
            onToggle={setTwoFactor}
            accentColor={Colors.primary}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('security.activeSessionsTitle')}</Text>
        <View style={styles.card}>
          <View style={styles.sessionRow}>
            <PhoneIcon size={20} color={Colors.textSecondary} />
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDevice}>{t('security.thisDevice')}</Text>
              <Text style={styles.sessionTime}>{t('security.activeNow')}</Text>
            </View>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>{t('security.currentBadge')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(SecurityScreen);

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
  scroll: { padding: 16, paddingBottom: 40 },
  scoreCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 18,
    padding: 18, marginBottom: 20,
    shadowColor: Colors.primaryDark, shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 4, borderWidth: 1, borderColor: Colors.border, gap: 16,
  },
  scoreRing: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 4, borderColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row',
  },
  scoreValue: { fontSize: 24, fontWeight: '800', color: Colors.text },
  scoreMax: { fontSize: 13, color: Colors.textMuted, alignSelf: 'flex-end', marginBottom: 6 },
  scoreInfo: { flex: 1 },
  scoreLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scoreHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    overflow: 'hidden', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  toggleIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  toggleSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 68 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, paddingHorizontal: 4,
  },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  sessionInfo: { flex: 1 },
  sessionDevice: { fontSize: 15, fontWeight: '600', color: Colors.text },
  sessionTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sessionBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10,
  },
  sessionBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.success },
});
