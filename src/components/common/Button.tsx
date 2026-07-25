import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

function Button({ title, onPress, loading, disabled, variant = 'primary', style, textStyle }: Props) {
  const isDisabled = disabled || loading;
  const typography = useTypography();

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.textOnPrimary : Colors.primary} />
      ) : (
        <Text style={[typography.labelLarge, styles.text, styles[`${variant}Text`], textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export default memo(Button);

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  primary: { backgroundColor: Colors.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16 },
  primaryText: { color: Colors.textOnPrimary },
  outlineText: { color: Colors.primary },
  dangerText: { color: Colors.textOnPrimary },
  ghostText: { color: Colors.primary },
});
