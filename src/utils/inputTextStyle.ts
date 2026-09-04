import { Platform, TextStyle } from 'react-native';

/**
 * Typography tokens include `lineHeight` for wrapped `Text`. iOS UITextField
 * treats extra leading as space above the glyphs, so the caret sits below
 * the vertical center of the field. Use this instead of a raw typography
 * token on every TextInput.
 */
export function centeredInputText(typo: TextStyle): TextStyle {
  const { lineHeight: _lineHeight, ...font } = typo;
  if (Platform.OS === 'android') {
    return {
      ...font,
      includeFontPadding: false,
      textAlignVertical: 'center',
    };
  }
  return font;
}
