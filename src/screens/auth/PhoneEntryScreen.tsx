import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { isValidPhone, formatPhone } from '../../utils/validation';
import { useSendOtpMutation } from '../../store/api/authApi';
import { resolveErrorMessage } from '../../utils/errors';

type Props = AuthScreenProps<'PhoneEntry'>;

const COUNTRY_CODE = '+20';

function PhoneEntryScreen({ navigation }: Props) {
  const { t } = useTranslation('auth');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState(COUNTRY_CODE);
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
        <View style={styles.header}>
          <Text style={styles.title}>{t('phoneEntry.title')}</Text>
          <Text style={styles.subtitle}>{t('phoneEntry.subtitle')}</Text>
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
          <Text style={styles.hint}>
            {t('phoneEntry.countryCodeHint')}
          </Text>
        </View>

        <Button
          title={t('common:continue')}
          onPress={handleContinue}
          loading={isLoading}
          disabled={phone.length < 7}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(PhoneEntryScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between' },
  header: { gap: 8, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  form: { flex: 1 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: -8, marginBottom: 16 },
});
