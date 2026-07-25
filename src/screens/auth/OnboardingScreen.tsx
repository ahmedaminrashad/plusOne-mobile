import React, { useCallback, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { AppStorage } from '../../utils/storage';

type Props = AuthScreenProps<'Onboarding'>;

function ReceiptIllustration() {
  const typography = useTypography();
  return (
    <View style={styles.illustrationCard}>
      <Text style={[typography.labelMedium, styles.illustrationVenue]}>ZOOBA · KORBA</Text>
      <Text style={[typography.caption, styles.illustrationMuted]}>#0412</Text>
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
    </View>
  );
}

function AssignIllustration() {
  const typography = useTypography();
  return (
    <View style={styles.illustrationCard}>
      <View style={styles.illustrationRow}>
        <Text style={[typography.bodyMedium, styles.illustrationRowText]}>Grilled shrimp ¼</Text>
        <Text style={[typography.amountMedium, styles.illustrationRowAmount]}>270.00</Text>
      </View>
      <Text style={[typography.labelMedium, styles.illustrationVenue, styles.illustrationSpacedTop]}>
        Who took this one?
      </Text>
      <View style={styles.avatarRow}>
        <Avatar name="Omar" size={40} />
        <Avatar name="You" size={40} />
        <Avatar name="Salma" size={40} />
      </View>
      <Text style={[typography.caption, styles.illustrationMuted, styles.illustrationSpacedTop]}>
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
        <Text style={styles.settleCheck}>✓</Text>
      </View>
      <Text style={[typography.amountLarge, styles.settleAmount]}>EGP 206.67</Text>
      <Text style={[typography.bodyMedium, styles.illustrationMuted]}>sent to Omar · InstaPay</Text>
      <Text style={[typography.labelMedium, styles.settleConfirmed]}>Settled in 4 seconds</Text>
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
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
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
  illustrationVenue: { color: Colors.text },
  illustrationMuted: { color: Colors.textMuted },
  illustrationSpacedTop: { marginTop: 12 },
  illustrationDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 10 },
  illustrationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  illustrationRowText: { color: Colors.text },
  illustrationRowAmount: { color: Colors.text },
  avatarRow: { flexDirection: 'row', gap: 8, marginTop: 10 },

  settleBadge: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  settleCheck: { color: Colors.success, fontSize: 24 },
  settleAmount: { color: Colors.text, textAlign: 'center' },
  settleConfirmed: { color: Colors.success, textAlign: 'center', marginTop: 4 },

  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 20 },
  nextButton: { width: '100%' },
});
