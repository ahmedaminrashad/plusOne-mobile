import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import SafeScreen from '../../components/common/SafeScreen';
import { useTranslation } from 'react-i18next';
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { useLoginWithFirebaseMutation, useVerifyOtpMutation, useSendOtpMutation } from '../../store/api/authApi';
import { sendFirebaseSms, confirmFirebaseSms, mapFirebaseAuthError } from '../../services/firebasePhoneAuth';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { setTokens, setProfileComplete } from '../../store/slices/authSlice';
import { SecureStorage } from '../../utils/storage';
import { resolveErrorMessage } from '../../utils/errors';
import { markAuthGrace } from '../../store/api/baseApi';

type Props = AuthScreenProps<'OTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const MAGIC_OTP = '111111';

function OTPVerificationScreen({ route, navigation }: Props) {
  const { t } = useTranslation('auth');
  const typography = useTypography();
  const { phone, firebaseSmsSent = true } = route.params;
  const dispatch = useAppDispatch();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState(
    !firebaseSmsSent && Platform.OS === 'ios' ? t('otpVerification.smsNotSent') : '',
  );
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loginWithFirebase, { isLoading: isFirebaseLogin }] = useLoginWithFirebaseMutation();
  const [verifyOtp, { isLoading: isBackendLogin }] = useVerifyOtpMutation();
  const [sendOtp] = useSendOtpMutation();
  const [isSending, setIsSending] = useState(false);
  const isLoading = isFirebaseLogin || isBackendLogin;

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
      const result =
        otp === MAGIC_OTP
          ? await verifyOtp({ phone, code: otp }).unwrap()
          : await loginWithFirebase({ idToken: await confirmFirebaseSms(otp) }).unwrap();
      await SecureStorage.saveTokens(result.accessToken, result.refreshToken, result.isProfileComplete);
      markAuthGrace();
      dispatch(setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken }));
      dispatch(setProfileComplete(result.isProfileComplete));

      if (!result.isProfileComplete) {
        navigation.navigate('ProfileSetup');
      }
    } catch (err: unknown) {
      const mapped = mapFirebaseAuthError(err);
      setError(
        mapped === 'GENERIC' ? resolveErrorMessage(err) : resolveErrorMessage({ data: { message: mapped } }),
      );
      setOtp('');
    }
  }, [otp, phone, verifyOtp, loginWithFirebase, dispatch, navigation]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setIsSending(true);
    try {
      await sendOtp({ phone }).unwrap();
      let smsSent = false;
      try {
        await sendFirebaseSms(phone);
        setError('');
        smsSent = true;
      } catch (err: unknown) {
        const mapped = mapFirebaseAuthError(err);
        setError(
          mapped === 'GENERIC'
            ? t('otpVerification.smsNotSent')
            : resolveErrorMessage({ data: { message: mapped } }),
        );
      }
      setOtp('');
      if (smsSent) {
        setCooldown(RESEND_COOLDOWN);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setCooldown((c) => {
            if (c <= 1) { clearInterval(timerRef.current!); return 0; }
            return c - 1;
          });
        }, 1000);
      }
    } catch (err: unknown) {
      setError(t('otpVerification.resendFailed'));
    } finally {
      setIsSending(false);
    }
  }, [cooldown, phone, sendOtp, t]);

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
    <SafeScreen style={styles.container}>
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
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          caretHidden
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
    </SafeScreen>
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
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.02,
    left: 0,
    top: 0,
  },
  error: { color: Colors.danger, textAlign: 'center', marginTop: -8 },
  resendBtn: { alignSelf: 'center', padding: 8 },
  resendText: { color: Colors.primary },
  resendDisabled: { color: Colors.textMuted },
  verifyBtn: {},
});
