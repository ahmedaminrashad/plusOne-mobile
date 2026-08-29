import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { resolveErrorMessage } from '../../utils/errors';

type Props = AuthScreenProps<'PhoneEntry'>;

const COUNTRY_CODE = '+20';

function PhoneEntryScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
  const typography = useTypography();
  const [phone, setPhone] = useState('');
  const [countryCode] = useState(COUNTRY_CODE);
  const [error, setError] = useState('');
  const [sendOtp, { isLoading }] = useSendOtpMutation();

  const fullPhone = formatPhone(phone, countryCode);

  const handleContinue = useCallback(async () => {
    setError('');

    if (!isValidPhone(fullPhone)) {
      setError(t('phoneEntry.invalidPhone'));
      return;
    }

    try {
      await sendOtp({ phone: fullPhone }).unwrap();
      try {
        await sendFirebaseSms(fullPhone);
      } catch {
        // Firebase SMS is optional — backend magic code 111111 still works.
      }
      navigation.navigate('OTPVerification', { phone: fullPhone });
    } catch (err: unknown) {
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
  headline: { color: Colors.text, textAlign: 'left', marginBottom: 24 },
  form: { marginBottom: 4 },
  hint: { color: Colors.textSecondary, marginTop: 10 },
  spacer: { flexGrow: 1, minHeight: 24 },
  terms: { color: Colors.textSecondary, textAlign: 'center' },
});
