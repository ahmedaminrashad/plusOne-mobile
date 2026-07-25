import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { useTypography } from '../../hooks/useTypography';
import { isValidPhone, formatPhone } from '../../utils/validation';
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
      navigation.navigate('OTPVerification', { phone: fullPhone });
    } catch (err: any) {
      setError(resolveErrorMessage(err));
    }
  }, [fullPhone, sendOtp, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.logoSection}>
          <Image source={require('../../../assets/PlusOne.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[typography.headingMedium, styles.appName]}>+one</Text>
          <Text style={[typography.bodyLarge, styles.tagline]}>{t('phoneEntry.tagline')}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('phoneEntry.phoneLabel')}
            prefix={countryCode}
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(''); }}
            keyboardType="phone-pad"
            placeholder={t('phoneEntry.phonePlaceholder')}
            maxLength={11}
            error={error}
            autoFocus
          />
          <Text style={[typography.caption, styles.hint]}>{t('phoneEntry.hint')}</Text>
        </View>

        <View style={styles.footer}>
          <Button
            title={t('common:continue')}
            onPress={handleContinue}
            loading={isLoading}
            disabled={phone.length < 7}
          />
          <Text style={[typography.caption, styles.terms]}>{t('phoneEntry.terms')}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(PhoneEntryScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between' },
  logoSection: { alignItems: 'center', gap: 8, marginBottom: 24 },
  logo: { width: 64, height: 64, marginBottom: 4 },
  appName: { color: Colors.primary },
  tagline: { color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  form: { flex: 1, justifyContent: 'center' },
  hint: { color: Colors.textMuted, marginTop: -8 },
  footer: { gap: 12 },
  terms: { color: Colors.textMuted, textAlign: 'center' },
});
