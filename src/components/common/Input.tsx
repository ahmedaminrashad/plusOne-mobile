import React, { memo, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/radius';
import { useTypography } from '../../hooks/useTypography';
import { centeredInputText } from '../../utils/inputTextStyle';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  /** Non-editable leading value (e.g. country code +20). */
  prefix?: string;
}

const Input = forwardRef<TextInput, Props>(
  ({ label, error, containerStyle, prefix, style, ...rest }, ref) => {
    const typography = useTypography();
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[typography.labelMedium, styles.label]}>{label}</Text>}
        <View style={[styles.inputWrapper, error && styles.inputError]}>
          {prefix ? (
            <>
              <View style={styles.prefixChip}>
                <Text style={[centeredInputText(typography.bodyLarge), styles.prefix]}>{prefix}</Text>
              </View>
              <View style={styles.prefixDivider} />
            </>
          ) : null}
          <TextInput
            ref={ref}
            style={[centeredInputText(typography.bodyLarge), styles.input, style]}
            placeholderTextColor={Colors.textMuted}
            textAlignVertical="center"
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
    paddingHorizontal: 4,
    height: 52,
    overflow: 'hidden',
  },
  inputError: { borderColor: Colors.danger },
  prefixChip: {
    height: '100%',
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral100,
  },
  prefix: {
    color: Colors.text,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  prefixDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 10,
    backgroundColor: Colors.border,
  },
  input: {
    flex: 1,
    color: Colors.text,
    paddingHorizontal: 12,
    // Zero default OS padding so the caret lines up with the country-code chip.
    paddingTop: 0,
    paddingBottom: 0,
    margin: 0,
    height: '100%',
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  errorText: { color: Colors.danger, marginTop: 4 },
});
