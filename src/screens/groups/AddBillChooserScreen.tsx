import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';

type Props = AppScreenProps<'AddBillChooser'>;

function AddBillChooserScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const { groupId, groupName } = route.params;

  const options = [
    {
      key: 'qr',
      icon: '⬜',
      iconBg: Colors.primary,
      iconColor: '#fff',
      title: t('addBillChooser.scanQrTitle'),
      subtitle: t('addBillChooser.scanQrSubtitle'),
      badge: t('addBillChooser.scanQrBadge'),
      highlighted: true,
      onPress: () => navigation.navigate('QRScanner', { groupId, groupName }),
    },
    {
      key: 'ocr',
      icon: '📷',
      iconBg: Colors.tint,
      iconColor: Colors.primary,
      title: t('addBillChooser.scanReceiptTitle'),
      subtitle: t('addBillChooser.scanReceiptSubtitle'),
      onPress: () => navigation.navigate('OCRCapture', { groupId, groupName }),
    },
    {
      key: 'manual',
      icon: '+',
      iconBg: Colors.tint,
      iconColor: Colors.primary,
      title: t('addBillChooser.manualTitle'),
      subtitle: t('addBillChooser.manualSubtitle'),
      onPress: () => navigation.navigate('AddBill', { groupId, groupName }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={[typography.headingLarge, styles.back]}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={[typography.headingLarge, styles.title]}>{t('addBillChooser.title')}</Text>
          <Text style={[typography.bodyMedium, styles.subtitle]}>
            {t('addBillChooser.subtitle', { groupName })}
          </Text>
        </View>
      </View>

      <View style={styles.options}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, opt.highlighted && styles.optionHighlighted]}
            onPress={opt.onPress}
            activeOpacity={0.75}>
            <View style={[styles.optionIconWrap, { backgroundColor: opt.iconBg }]}>
              <Text style={[styles.optionIcon, { color: opt.iconColor }]}>{opt.icon}</Text>
            </View>
            <View style={styles.optionInfo}>
              <Text style={[typography.headingSmall, styles.optionTitle]}>{opt.title}</Text>
              <Text style={[typography.bodySmall, styles.optionSubtitle]}>{opt.subtitle}</Text>
            </View>
            {opt.badge && (
              <View style={styles.badge}>
                <Text style={[typography.labelSmall, styles.badgeText]}>{opt.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[typography.caption, styles.footer]}>{t('addBillChooser.footer')}</Text>
    </SafeAreaView>
  );
}

export default memo(AddBillChooserScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  back: { color: Colors.accent },
  title: { color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: 2 },

  options: { paddingHorizontal: 20, gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    padding: 16,
  },
  optionHighlighted: { borderColor: Colors.primary },
  optionIconWrap: {
    width: 52, height: 52, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  optionIcon: { fontSize: 22, fontWeight: '700' },
  optionInfo: { flex: 1 },
  optionTitle: { color: Colors.text },
  optionSubtitle: { color: Colors.textMuted, marginTop: 2 },
  badge: { backgroundColor: Colors.warningTint, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: Colors.accent },

  footer: { color: Colors.textMuted, textAlign: 'center', marginTop: 20, paddingHorizontal: 32 },
});
