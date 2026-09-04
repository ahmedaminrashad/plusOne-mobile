import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { useTypography } from '../../hooks/useTypography';
import { isValidPhone, formatPhone } from '../../utils/validation';
import { sendFirebaseSms } from '../../services/firebasePhoneAuth';
import { useSendOtpMutation } from '../../store/api/authApi';
import { changeLanguage, AppLanguage } from '../../i18n';
import { resolveErrorMessage } from '../../utils/errors';

type Props = AuthScreenProps<'PhoneEntry'>;

const COUNTRY_CODE = '+20';

function PhoneEntryScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation('auth');
  const typography = useTypography();
  const [phone, setPhone] = useState('');
  const [countryCode] = useState(COUNTRY_CODE);
  const [error, setError] = useState('');
  const [sendOtp, { isLoading: isSendingBackend }] = useSendOtpMutation();
  const [isSendingFirebase, setIsSendingFirebase] = useState(false);
  const isLoading = isSendingBackend || isSendingFirebase;
  const currentLanguage = (i18n.language === 'ar' ? 'ar' : 'en') as AppLanguage;

  const toggleLanguage = useCallback(() => {
    changeLanguage(currentLanguage === 'en' ? 'ar' : 'en');
  }, [currentLanguage]);

  const fullPhone = formatPhone(phone, countryCode);

  const handleContinue = useCallback(async () => {
    setError('');

    if (!isValidPhone(fullPhone)) {
      setError(t('phoneEntry.invalidPhone'));
      return;
    }

    try {
      Keyboard.dismiss();
      await sendOtp({ phone: fullPhone }).unwrap();
      setIsSendingFirebase(true);
      let firebaseSmsSent = false;
      try {
        // Stay on this screen until Firebase finishes. Navigating away while
        // Safari reCAPTCHA is open cancels the session and no SMS is sent.
        await sendFirebaseSms(fullPhone);
        firebaseSmsSent = true;
      } catch {
        // Continue to OTP so 111111 still works if Firebase SMS fails.
      } finally {
        setIsSendingFirebase(false);
      }
      navigation.navigate('OTPVerification', { phone: fullPhone, firebaseSmsSent });
    } catch (err: unknown) {
      setIsSendingFirebase(false);
      setError(resolveErrorMessage(err));
    }
  }, [fullPhone, sendOtp, navigation, t]);

  const handlePhoneChange = useCallback((v: string) => {
    // Keep only digits in the editable field — country code lives in the prefix chip.
    setPhone(v.replace(/\D/g, ''));
    setError('');
  }, []);

  return (
    <SafeScreen style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage} hitSlop={12}>
            <Text style={[typography.labelMedium, styles.langToggleText]}>
              {currentLanguage === 'en' ? 'العربية' : 'English'}
            </Text>
          </TouchableOpacity>
          <Image
            source={require('../../../assets/PlusOne.png')}
            style={styles.logo}
            tintColor={Colors.primaryDark}
            resizeMode="contain"
          />
          <Text style={[typography.headingLarge, styles.headline]}>{t('phoneEntry.tagline')}</Text>

          <View style={styles.form}>
            <Input
              label={t('phoneEntry.phoneLabel')}
              prefix={countryCode}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              placeholder={t('phoneEntry.phonePlaceholder')}
              maxLength={11}
              error={error}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          <Button
            title={t('common:continue')}
            onPress={handleContinue}
            loading={isLoading}
            disabled={phone.length < 7}
          />
          <Text style={[typography.caption, styles.hint]}>{t('phoneEntry.hint')}</Text>

          <View style={styles.spacer} />

          <Text style={[typography.caption, styles.terms]}>{t('phoneEntry.terms')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

export default memo(PhoneEntryScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  logo: { width: 56, height: 56, marginBottom: 20 },
  langToggle: { alignSelf: 'flex-end', marginBottom: 8, paddingVertical: 4, paddingHorizontal: 8 },
  langToggleText: { color: Colors.primary },
  headline: { color: Colors.text, textAlign: 'left', marginBottom: 24 },
  form: { marginBottom: 4 },
  hint: { color: Colors.textSecondary, marginTop: 10 },
  spacer: { flexGrow: 1, minHeight: 24 },
  terms: { color: Colors.textSecondary, textAlign: 'center' },
});
