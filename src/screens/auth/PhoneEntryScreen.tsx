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
            onChangeText={(v) => { setPhone(v); setError(''); }}
            keyboardType="phone-pad"
            placeholder={t('phoneEntry.phonePlaceholder')}
            maxLength={11}
            error={error}
            autoFocus
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(PhoneEntryScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  logo: { width: 56, height: 56, marginBottom: 20 },
  headline: { color: Colors.text, textAlign: 'left', marginBottom: 24 },
  form: { marginBottom: 4 },
  hint: { color: Colors.textSecondary, marginTop: 10 },
  spacer: { flex: 1 },
  terms: { color: Colors.textSecondary, textAlign: 'center' },
});
