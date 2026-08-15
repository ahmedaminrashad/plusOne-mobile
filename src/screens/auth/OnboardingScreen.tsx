import React, { useCallback, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { AppStorage } from '../../utils/storage';
import { CheckIcon } from '../../components/icons';

type Props = AuthScreenProps<'Onboarding'>;

function ReceiptIllustration() {
  const typography = useTypography();
  return (
    <View style={styles.illustrationCard}>
      <Text style={[typography.labelSmall, styles.illustrationVenue]}>ZOOBA · KORBA</Text>
      <Text style={[typography.labelSmall, styles.illustrationMuted]}>#0412</Text>
      <View style={styles.illustrationDivider} />
      {[
        ['Taameya wrap ×2', '140'],
        ['Koshari bowl', '95'],
        ['Hawawshi', '120'],
      ].map(([name, price]) => (
        <View key={name} style={styles.illustrationRow}>
          <Text style={[typography.bodyMedium, styles.illustrationRowText]}>{name}</Text>
          <Text style={[typography.amountMedium, styles.illustrationRowAmount]}>{price}</Text>
        </View>
      ))}
      <View style={styles.scanAccentBar} />
      <View style={styles.scanIcon}>
        <View style={[styles.scanCorner, styles.scanCornerTL]} />
        <View style={[styles.scanCorner, styles.scanCornerTR]} />
        <View style={[styles.scanCorner, styles.scanCornerBL]} />
        <View style={[styles.scanDot, styles.scanDot1]} />
        <View style={[styles.scanDot, styles.scanDot2]} />
        <View style={[styles.scanDot, styles.scanDot3]} />
      </View>
    </View>
  );
}

function AssignAvatar({ name, selected }: { name: string; selected: boolean }) {
  const typography = useTypography();
  return (
    <View style={[styles.assignAvatarCard, selected ? styles.assignAvatarCardSelected : styles.assignAvatarCardMuted]}>
      <Avatar name={name} size={26} />
      <Text
        style={[
          typography.labelSmall,
          styles.assignAvatarName,
          selected ? styles.assignAvatarNameSelected : styles.assignAvatarNameMuted,
        ]}
        numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function AssignIllustration() {
  const typography = useTypography();
  return (
    <View style={styles.illustrationCard}>
      <View style={styles.illustrationRow}>
        <Text style={[typography.labelLarge, styles.illustrationRowText]}>Grilled shrimp ¼</Text>
        <Text style={[typography.amountMedium, styles.illustrationRowAmount]}>270.00</Text>
      </View>
      <Text style={[typography.labelSmall, styles.illustrationVenue, styles.illustrationSpacedTop]}>
        Who took this one?
      </Text>
      <View style={styles.avatarRow}>
        <AssignAvatar name="Omar" selected />
        <AssignAvatar name="You" selected />
        <AssignAvatar name="Salma" selected={false} />
      </View>
      <Text style={[typography.labelSmall, styles.assignSharedCaption, styles.illustrationSpacedTop]}>
        Shared by 2 · 135.00 each
      </Text>
    </View>
  );
}

function SettleIllustration() {
  const typography = useTypography();
  return (
    <View style={styles.illustrationCard}>
      <View style={styles.settleBadge}>
        <CheckIcon size={24} color={Colors.success} strokeWidth={2.25} />
      </View>
      <Text style={[typography.amountLarge, styles.settleAmount]}>EGP 206.67</Text>
      <Text style={[typography.caption, styles.illustrationMuted]}>sent to Omar · InstaPay</Text>
      <View style={styles.settledBadge}>
        <Text style={[typography.labelSmall, styles.settledBadgeText]}>Settled in 4 seconds</Text>
      </View>
    </View>
  );
}

function OnboardingScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
  const typography = useTypography();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const slides = [
    { key: '1', Illustration: ReceiptIllustration, title: t('onboarding.slide1Title'), subtitle: t('onboarding.slide1Subtitle') },
    { key: '2', Illustration: AssignIllustration, title: t('onboarding.slide2Title'), subtitle: t('onboarding.slide2Subtitle') },
    { key: '3', Illustration: SettleIllustration, title: t('onboarding.slide3Title'), subtitle: t('onboarding.slide3Subtitle') },
  ];

  const finishOnboarding = useCallback(async () => {
    await AppStorage.setHasSeenOnboarding();
    navigation.replace('PhoneEntry');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finishOnboarding();
    }
  }, [index, slides.length, finishOnboarding]);

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }, [width]);

  const isLast = index === slides.length - 1;

  return (
    <SafeScreen style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={finishOnboarding} hitSlop={12}>
        <Text style={[typography.labelMedium, styles.skipText]}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <item.Illustration />
            <Text style={[typography.headingLarge, styles.title]}>{item.title}</Text>
            <Text style={[typography.bodyLarge, styles.subtitle]}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          title={isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          onPress={handleNext}
          style={styles.nextButton}
        />
      </View>
    </SafeScreen>
  );
}

export default memo(OnboardingScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  skipButton: { position: 'absolute', top: 16, right: 20, zIndex: 1, padding: 8 },
  skipText: { color: Colors.textSecondary },
  slide: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 32 },
  title: { color: Colors.text, textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, textAlign: 'center' },

  illustrationCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  // Figma colours these captions textSecondary (#66706B), not the darker ink/muted tones.
  illustrationVenue: { color: Colors.textSecondary },
  illustrationMuted: { color: Colors.textSecondary, textAlign: 'center', alignSelf: 'center' },
  illustrationSpacedTop: { marginTop: 12 },
  illustrationDivider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: Colors.borderLight, marginVertical: 10 },
  illustrationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  illustrationRowText: { color: Colors.text },
  illustrationRowAmount: { color: Colors.text },

  // ── Slide 1 — scan accent (amber bar + QR-style viewfinder glyph) ──
  scanAccentBar: {
    alignSelf: 'center',
    width: '85%',
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accent,
    marginTop: 10,
    marginBottom: 14,
  },
  scanIcon: { alignSelf: 'center', width: 45, height: 45, marginBottom: 4 },
  scanCorner: { position: 'absolute', width: 17, height: 17, borderRadius: 3, backgroundColor: Colors.text },
  scanCornerTL: { top: 0, left: 0 },
  scanCornerTR: { top: 0, right: 0 },
  scanCornerBL: { bottom: 0, left: 0 },
  scanDot: { position: 'absolute', width: 7, height: 7, borderRadius: 2, backgroundColor: Colors.text },
  scanDot1: { bottom: 0, right: 0 },
  scanDot2: { bottom: 0, right: 10 },
  scanDot3: { bottom: 10, right: 0 },

  // ── Slide 2 — assign avatars (selected vs unselected participant tint) ──
  avatarRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  assignAvatarCard: { width: 54, paddingVertical: 8, paddingHorizontal: 4, borderRadius: Radius.lg, alignItems: 'center', gap: 4 },
  assignAvatarCardSelected: { backgroundColor: Colors.tint },
  assignAvatarCardMuted: { backgroundColor: Colors.surfaceElevated },
  assignAvatarName: {},
  assignAvatarNameSelected: { color: Colors.primary },
  assignAvatarNameMuted: { color: Colors.textSecondary },
  assignSharedCaption: { color: Colors.primary },

  // ── Slide 3 — settle confirmation ──
  settleBadge: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  settleAmount: { color: Colors.primaryDark, textAlign: 'center' },
  settledBadge: {
    alignSelf: 'center',
    backgroundColor: Colors.successTint,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  settledBadgeText: { color: Colors.secondaryDark },

  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 20 },
  nextButton: { width: '100%' },
});
