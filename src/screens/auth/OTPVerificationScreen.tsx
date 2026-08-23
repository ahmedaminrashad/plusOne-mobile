import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useLoginWithFirebaseMutation } from '../../store/api/authApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { applyAuthSession } from '../../utils/applyAuthSession';
import {
  confirmFirebasePhoneCode,
  sendFirebasePhoneCode,
} from '../../services/firebasePhoneAuth';
import { resolveErrorMessage } from '../../utils/errors';

type Props = AuthScreenProps<'OTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function OTPVerificationScreen({ route, navigation }: Props) {
  const { t } = useTranslation('auth');
  const typography = useTypography();
  const { phone } = route.params;
  const dispatch = useAppDispatch();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loginWithFirebase, { isLoading }] = useLoginWithFirebaseMutation();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  const handleVerify = useCallback(async () => {
    setError('');
    try {
      const idToken = await confirmFirebasePhoneCode(otp);
      const result = await loginWithFirebase({ idToken }).unwrap();
      await applyAuthSession(result, dispatch);

      if (!result.isProfileComplete) {
        navigation.navigate('ProfileSetup');
      }
    } catch (err: any) {
      setError(resolveErrorMessage(err));
      setOtp('');
    }
  }, [otp, loginWithFirebase, dispatch, navigation]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setIsSending(true);
    try {
      await sendFirebasePhoneCode(phone);
      setCooldown(RESEND_COOLDOWN);
      setOtp('');
      setError('');
      timerRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(resolveErrorMessage(err) || t('otpVerification.resendFailed'));
    } finally {
      setIsSending(false);
    }
  }, [cooldown, phone, t]);

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    setError('');
    if (digits.length === OTP_LENGTH) {
      // auto-submit
      setTimeout(() => inputRef.current?.blur(), 50);
    }
  };

  useEffect(() => {
    if (otp.length === OTP_LENGTH) handleVerify();
  }, [otp]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={[typography.headingLarge, styles.title]}>{t('otpVerification.title')}</Text>
          <Text style={[typography.bodyLarge, styles.subtitle]}>
            {t('otpVerification.subtitle')}{'\n'}
            <Text style={[typography.labelLarge, styles.phone]}>{phone}</Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.otpContainer} onPress={() => inputRef.current?.focus()} activeOpacity={1}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.otpBox,
                otp.length === i && styles.otpBoxActive,
                error && styles.otpBoxError,
              ]}>
              <Text style={[typography.headingLarge, styles.otpDigit]}>{otp[i] ?? ''}</Text>
            </View>
          ))}
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          autoFocus
        />

        {error ? <Text style={[typography.bodyMedium, styles.error]}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleResend}
          disabled={cooldown > 0 || isSending}
          style={styles.resendBtn}>
          <Text style={[typography.labelLarge, styles.resendText, cooldown > 0 && styles.resendDisabled]}>
            {cooldown > 0 ? t('otpVerification.resendCountdown', { count: cooldown }) : t('otpVerification.resendCode')}
          </Text>
        </TouchableOpacity>

        <Button
          title={t('otpVerification.verifyButton')}
          onPress={handleVerify}
          loading={isLoading}
          disabled={otp.length < OTP_LENGTH}
          style={styles.verifyBtn}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default memo(OTPVerificationScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between' },
  header: { gap: 10 },
  title: { color: Colors.text },
  subtitle: { color: Colors.textSecondary },
  phone: { color: Colors.text },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginVertical: 24 },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: { borderColor: Colors.primary },
  otpBoxError: { borderColor: Colors.danger },
  otpDigit: { color: Colors.text },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
  error: { color: Colors.danger, textAlign: 'center', marginTop: -8 },
  resendBtn: { alignSelf: 'center', padding: 8 },
  resendText: { color: Colors.primary },
  resendDisabled: { color: Colors.textMuted },
  verifyBtn: {},
});
