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
import { SettingsScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';

type Props = SettingsScreenProps<'SecuritySettings'>;

interface ToggleRowProps {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accentColor?: string;
}

function ToggleRow({ icon, title, subtitle, value, onToggle, accentColor }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: (accentColor ?? Colors.primary) + '18' }]}>
        <Text style={styles.toggleIconText}>{icon}</Text>
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
  const [biometrics, setBiometrics] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleBiometricsToggle = useCallback((v: boolean) => {
    if (v) {
      Alert.alert(
        'تفعيل بصمة الاصبع',
        'سيطلب منك التحقق عند كل تسجيل دخول.',
        [
          { text: 'الغاء', style: 'cancel' },
          { text: 'تفعيل', onPress: () => setBiometrics(true) },
        ],
      );
    } else {
      setBiometrics(false);
    }
  }, []);

  const score = biometrics && loginAlerts ? 8 : loginAlerts ? 5 : 3;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.header}>
        <View style={styles.deco1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الامان والخصوصية</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreCard}>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreMax}>/10</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreLabel}>نقاط الامان</Text>
            <Text style={styles.scoreHint}>فعل المزيد من الخيارات لحساب اكثر امانا</Text>
          </View>
        </View>

        <View style={styles.card}>
          <ToggleRow
            icon={"🔔"}
            title="تنبيهات تسجيل الدخول"
            subtitle="إشعار عند تسجيل دخول جديد"
            value={loginAlerts}
            onToggle={setLoginAlerts}
            accentColor={Colors.secondary}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={"🖐️"}
            title="البصمة / التعرف على الوجه"
            subtitle="تسجيل الدخول بالمعرّف الحيوي"
            value={biometrics}
            onToggle={handleBiometricsToggle}
            accentColor={Colors.accent}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={"🔐"}
            title="التحقق بخطوتين"
            subtitle="طبقة حماية إضافية عند تسجيل الدخول"
            value={twoFactor}
            onToggle={setTwoFactor}
            accentColor={Colors.primary}
          />
        </View>

        <Text style={styles.sectionTitle}>الجلسات النشطة</Text>
        <View style={styles.card}>
          <View style={styles.sessionRow}>
            <Text style={styles.sessionDeviceIcon}>{"📱"}</Text>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDevice}>هذا الجهاز</Text>
              <Text style={styles.sessionTime}>نشط الآن</Text>
            </View>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>حالي</Text>
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
  toggleIconText: { fontSize: 16, color: Colors.textSecondary },
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
  sessionDeviceIcon: { fontSize: 22 },
  sessionInfo: { flex: 1 },
  sessionDevice: { fontSize: 15, fontWeight: '600', color: Colors.text },
  sessionTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sessionBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10,
  },
  sessionBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.success },
});
