import { TextStyle } from 'react-native';

type FontWeight = TextStyle['fontWeight'];

const w = (fontWeight: FontWeight, fontSize: number, lineHeight: number): TextStyle => ({
  fontWeight,
  fontSize,
  lineHeight,
});

export const Typography = {
  displayLarge:  w('800', 32, 40),
  displayMedium: w('800', 26, 34),
  headingLarge:  w('700', 20, 28),
  headingMedium: w('700', 17, 24),
  headingSmall:  w('600', 15, 22),
  bodyLarge:     w('400', 15, 24),
  bodyMedium:    w('400', 13, 20),
  bodySmall:     w('400', 11, 18),
  labelLarge:    w('600', 14, 20),
  labelMedium:   w('600', 12, 18),
  labelSmall:    w('500', 10, 16),
  caption:       w('400', 11, 16),
} as const;
