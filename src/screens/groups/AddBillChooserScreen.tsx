import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AppScreenProps } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { ChevronLeftIcon, QrCodeIcon, CameraIcon, EditIcon } from '../../components/icons';

type Props = AppScreenProps<'AddBillChooser'>;

function AddBillChooserScreen({ route, navigation }: Props) {
  const { t } = useTranslation('billing');
  const typography = useTypography();
  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName;
  const deferGroup = !groupId;

  const go = (screen: 'QRScanner' | 'OCRCapture' | 'AddBill') => {
    if (deferGroup) {
      navigation.navigate(screen, {});
      return;
    }
    navigation.navigate(screen, { groupId: groupId!, groupName: groupName! });
  };

  const options = [
    {
      key: 'qr',
      icon: QrCodeIcon,
      iconBg: Colors.primary,
      iconColor: '#fff',
      title: t('addBillChooser.scanQrTitle'),
      subtitle: t('addBillChooser.scanQrSubtitle'),
      badge: t('addBillChooser.scanQrBadge'),
      highlighted: true,
      onPress: () => go('QRScanner'),
    },
    {
      key: 'ocr',
      icon: CameraIcon,
      iconBg: Colors.tint,
      iconColor: Colors.primary,
      title: t('addBillChooser.scanReceiptTitle'),
      subtitle: t('addBillChooser.scanReceiptSubtitle'),
      onPress: () => go('OCRCapture'),
    },
    {
      key: 'manual',
      icon: EditIcon,
      iconBg: Colors.tint,
      iconColor: Colors.primary,
      title: t('addBillChooser.manualTitle'),
      subtitle: t('addBillChooser.manualSubtitle'),
      onPress: () => go('AddBill'),
    },
  ];

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeftIcon size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[typography.headingLarge, styles.title]}>{t('addBillChooser.title')}</Text>
          <Text style={[typography.bodyMedium, styles.subtitle]}>
            {deferGroup
              ? t('addBillChooser.subtitlePickGroupLater')
              : t('addBillChooser.subtitle', { groupName })}
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
              <opt.icon size={22} color={opt.iconColor} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[typography.headingSmall, styles.optionTitle]}>{opt.title}</Text>
              <Text style={[typography.bodySmall, styles.optionSubtitle]}>{opt.subtitle}</Text>
            </View>
            {opt.badge && (
              <View style={styles.badge}>
                <Text style={[typography.labelSmall, styles.badgeText]} numberOfLines={1}>{opt.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[typography.caption, styles.footer]}>
        {deferGroup ? t('addBillChooser.footerPickGroupLater') : t('addBillChooser.footer')}
      </Text>
    </SafeScreen>
  );
}

export default memo(AddBillChooserScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  backBtn: {
    width: 34, height: 34, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.borderLight,
    marginTop: 2,
  },
  headerText: { flex: 1 },
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
    width: 50, height: 50, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  optionInfo: { flex: 1 },
  optionTitle: { color: Colors.text },
  optionSubtitle: { color: Colors.textSecondary, marginTop: 2 },
  badge: { backgroundColor: Colors.accent, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff' },

  footer: { color: Colors.textSecondary, textAlign: 'center', marginTop: 20, paddingHorizontal: 32 },
});
