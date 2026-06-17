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
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Colors } from '../../constants/colors';
import { isValidPhone, formatPhone } from '../../utils/validation';
import { useSendOtpMutation } from '../../store/api/authApi';

type Props = AuthScreenProps<'PhoneEntry'>;

const COUNTRY_CODE = '+20';

function PhoneEntryScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState(COUNTRY_CODE);
  const [error, setError] = useState('');

  const [sendOtp, { isLoading }] = useSendOtpMutation();

  const fullPhone = formatPhone(phone, countryCode);

  const handleContinue = useCallback(async () => {
    setError('');

    if (!isValidPhone(fullPhone)) {
      setError('رقم الهاتف غير صحيح');
      return;
    }

    try {
      await sendOtp({ phone: fullPhone }).unwrap();
      navigation.navigate('OTPVerification', { phone: fullPhone });
    } catch (err: any) {
      const msg = err?.data?.message?.error ?? err?.data?.message ?? 'تعذر إرسال الكود، حاول مرة أخرى';
      setError(msg);
    }
  }, [fullPhone, sendOtp, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>أدخل رقم هاتفك</Text>
          <Text style={styles.subtitle}>سنرسل إليك رمز تحقق للتأكيد</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="رقم الهاتف"
            prefix={countryCode}
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(''); }}
            keyboardType="phone-pad"
            placeholder="10 XXXX XXXX"
            maxLength={11}
            error={error}
            autoFocus
          />
          <Text style={styles.hint}>
            كود مصر (+20) مُعبّأ تلقائياً، يمكنك تغييره
          </Text>
        </View>

        <Button
          title="متابعة"
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
