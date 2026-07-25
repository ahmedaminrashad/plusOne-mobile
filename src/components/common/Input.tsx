import React, { memo, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  prefix?: string;
}

const Input = forwardRef<TextInput, Props>(
  ({ label, error, containerStyle, prefix, style, ...rest }, ref) => {
    const typography = useTypography();
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[typography.labelMedium, styles.label]}>{label}</Text>}
        <View style={[styles.inputWrapper, error && styles.inputError]}>
          {prefix && <Text style={[typography.bodyLarge, styles.prefix]}>{prefix}</Text>}
          <TextInput
            ref={ref}
            style={[typography.bodyLarge, styles.input, style]}
            placeholderTextColor={Colors.textMuted}
            {...rest}
          />
        </View>
        {error ? <Text style={[typography.caption, styles.errorText]}>{error}</Text> : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
export default memo(Input);

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: Colors.textSecondary, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: { borderColor: Colors.danger },
  prefix: { color: Colors.text, marginRight: 8 },
  input: { flex: 1, color: Colors.text },
  errorText: { color: Colors.danger, marginTop: 4 },
});
