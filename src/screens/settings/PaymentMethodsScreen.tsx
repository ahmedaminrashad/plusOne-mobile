import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SettingsScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { useGetMeQuery } from '../../store/api/usersApi';

type Props = SettingsScreenProps<'PaymentMethods'>;

function PaymentMethodsScreen({ navigation }: Props) {
  const { data: me } = useGetMeQuery();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.header}>
        <View style={styles.deco1} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>وسائل الدفع</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* InstaPay highlight */}
        <View style={styles.instaCard}>
          <View style={styles.instaHeader}>
            <View style={styles.instaIconWrap}>
              <Text style={styles.instaIcon}>P</Text>
            </View>
            <View style={styles.instaInfo}>
              <Text style={styles.instaTitle}>InstaPay</Text>
              <Text style={styles.instaSubtitle}>
                {me?.instaPayAlias ? me.instaPayAlias : 'لم يتم الربط بعد'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.instaActionBtn,
                me?.instaPayAlias ? styles.instaActionBtnLinked : styles.instaActionBtnUnlinked,
              ]}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}>
              <Text style={[
                styles.instaActionText,
                me?.instaPayAlias ? styles.instaActionTextLinked : styles.instaActionTextUnlinked,
              ]}>
                {me?.instaPayAlias ? 'تعديل' : 'ربط'}
              </Text>
            </TouchableOpacity>
          </View>
          {me?.instaPayAlias && (
            <View style={styles.instaAlias}>
              <Text style={styles.instaAliasLabel}>المعرف</Text>
              <Text style={styles.instaAliasValue}>{me.instaPayAlias}</Text>
            </View>
          )}
        </View>

        {/* Coming soon */}
        <Text style={styles.sectionTitle}>طرق دفع اخرى</Text>
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonIcon}>🚧</Text>
          <Text style={styles.comingSoonTitle}>قريباً</Text>
          <Text style={styles.comingSoonSub}>ستتوفر بطاقات الائتمان والمحافظ الرقمية في التحديثات القادمة</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

export default memo(PaymentMethodsScreen);

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

  instaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  instaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instaIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  instaIcon: { fontSize: 22, fontWeight: '900', color: '#fff' },
  instaInfo: { flex: 1 },
  instaTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  instaSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  instaActionBtn: {
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  instaActionBtnLinked: { backgroundColor: Colors.secondary + '20' },
  instaActionBtnUnlinked: { backgroundColor: Colors.secondary },
  instaActionText: { fontSize: 13, fontWeight: '700' },
  instaActionTextLinked: { color: Colors.secondary },
  instaActionTextUnlinked: { color: '#fff' },
  instaAlias: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  instaAliasLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  instaAliasValue: { fontSize: 14, color: Colors.text, fontWeight: '700' },

  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8, paddingHorizontal: 4,
  },
  comingSoonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  comingSoonIcon: { fontSize: 36 },
  comingSoonTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  comingSoonSub: {
    fontSize: 13, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 20,
  },
});
