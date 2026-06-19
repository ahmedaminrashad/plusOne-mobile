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
import { AuthScreenProps } from '../../types/navigation';
import Button from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { useVerifyOtpMutation, useSendOtpMutation } from '../../store/api/authApi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { setTokens, setProfileComplete } from '../../store/slices/authSlice';
import { SecureStorage } from '../../utils/storage';

type Props = AuthScreenProps<'OTPVerification'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function OTPVerificationScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const dispatch = useAppDispatch();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: isSending }] = useSendOtpMutation();

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
      const result = await verifyOtp({ phone, code: otp }).unwrap();
      await SecureStorage.saveTokens(result.accessToken, result.refreshToken, result.isProfileComplete);
      dispatch(setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken }));
      dispatch(setProfileComplete(result.isProfileComplete));

      if (!result.isProfileComplete) {
        navigation.navigate('ProfileSetup');
      }
    } catch (err: any) {
      const msg = err?.data?.message?.error ?? err?.data?.message ?? 'الكود الذي أدخلته غير صحيح';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setOtp('');
    }
  }, [otp, phone, verifyOtp, dispatch, navigation]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    try {
      await sendOtp({ phone }).unwrap();
      setCooldown(RESEND_COOLDOWN);
      setOtp('');
      setError('');
      timerRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError('تعذر إرسال الكود، حاول مرة أخرى');
    }
  }, [cooldown, phone, sendOtp]);

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
          <Text style={styles.title}>أدخل رمز التحقق</Text>
          <Text style={styles.subtitle}>
            أرسلنا رمز مكوّن من 6 أرقام إلى{'\n'}
            <Text style={styles.phone}>{phone}</Text>
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
              <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleResend}
          disabled={cooldown > 0 || isSending}
          style={styles.resendBtn}>
          <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
            {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown}ث` : 'إعادة إرسال الرمز'}
          </Text>
        </TouchableOpacity>

        <Button
          title="تحقق"
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
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  phone: { fontWeight: '600', color: Colors.text },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginVertical: 24 },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: { borderColor: Colors.primary },
  otpBoxError: { borderColor: Colors.danger },
  otpDigit: { fontSize: 22, fontWeight: '700', color: Colors.text },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
  error: { fontSize: 13, color: Colors.danger, textAlign: 'center', marginTop: -8 },
  resendBtn: { alignSelf: 'center', padding: 8 },
  resendText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  resendDisabled: { color: Colors.textMuted },
  verifyBtn: {},
});
