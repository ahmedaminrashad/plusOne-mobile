import { TextStyle } from 'react-native';
import { AppLanguage } from '../i18n';

// Real internal PostScript names embedded in the linked .ttf files (assets/fonts) —
// these are what iOS registers fonts under; Android asset filenames mirror them exactly.
export const FontFamilies = {
  en: {
    displayExtraBold: 'Sora-ExtraBold',
    displayBold: 'Sora-Bold',
    displaySemiBold: 'Sora-SemiBold',
    bodyRegular: 'FigtreeLight-Regular',
    bodyMedium: 'FigtreeLight-Medium',
    bodySemiBold: 'FigtreeLight-SemiBold',
    monoRegular: 'SplineSansMono-Regular',
    monoMedium: 'SplineSansMono-Medium',
  },
  ar: {
    displayExtraBold: 'IBMPlexSansArabic-Bold',
    displayBold: 'IBMPlexSansArabic-Bold',
    displaySemiBold: 'IBMPlexSansArabic-SemiBold',
    bodyRegular: 'IBMPlexSansArabic-Regular',
    bodyMedium: 'IBMPlexSansArabic-Medium',
    bodySemiBold: 'IBMPlexSansArabic-SemiBold',
    // Amounts are always Western digits regardless of language — keep the mono face.
    monoRegular: 'SplineSansMono-Regular',
    monoMedium: 'SplineSansMono-Medium',
  },
} as const;

type Scale = Record<
  | 'displayLarge' | 'displayMedium'
  | 'headingLarge' | 'headingMedium' | 'headingSmall'
  | 'bodyLarge' | 'bodyMedium' | 'bodySmall'
  | 'labelLarge' | 'labelMedium' | 'labelSmall'
  | 'caption' | 'amountLarge' | 'amountMedium',
  TextStyle
>;

type FontFamilySet = Record<
  'displayExtraBold' | 'displayBold' | 'displaySemiBold' | 'bodyRegular' | 'bodyMedium' | 'bodySemiBold' | 'monoRegular' | 'monoMedium',
  string
>;

function buildTypography(fonts: FontFamilySet): Scale {
  return {
    displayLarge:  { fontFamily: fonts.displayExtraBold, fontSize: 32, lineHeight: 40 },
    displayMedium: { fontFamily: fonts.displayExtraBold, fontSize: 26, lineHeight: 34 },
    headingLarge:  { fontFamily: fonts.displayBold,      fontSize: 20, lineHeight: 28 },
    headingMedium: { fontFamily: fonts.displaySemiBold,  fontSize: 17, lineHeight: 24 },
    headingSmall:  { fontFamily: fonts.displaySemiBold,  fontSize: 15, lineHeight: 22 },
    bodyLarge:     { fontFamily: fonts.bodyRegular,       fontSize: 15, lineHeight: 24 },
    bodyMedium:    { fontFamily: fonts.bodyRegular,       fontSize: 13, lineHeight: 20 },
    bodySmall:     { fontFamily: fonts.bodyRegular,       fontSize: 11, lineHeight: 18 },
    labelLarge:    { fontFamily: fonts.bodySemiBold,      fontSize: 14, lineHeight: 20 },
    labelMedium:   { fontFamily: fonts.bodySemiBold,      fontSize: 12, lineHeight: 18 },
    labelSmall:    { fontFamily: fonts.bodyMedium,        fontSize: 10, lineHeight: 16 },
    caption:       { fontFamily: fonts.bodyRegular,       fontSize: 11, lineHeight: 16 },
    // Numeric amounts (e.g. "EGP 206.67") — always the mono face, both languages.
    amountLarge:   { fontFamily: fonts.monoMedium,        fontSize: 32, lineHeight: 38 },
    amountMedium:  { fontFamily: fonts.monoMedium,        fontSize: 18, lineHeight: 24 },
  };
}

export const TypographyByLanguage: Record<AppLanguage, Scale> = {
  en: buildTypography(FontFamilies.en),
  ar: buildTypography(FontFamilies.ar),
};

// Default export for language-agnostic/static usage (e.g. outside component render).
// Prefer useTypography() inside components so it reacts to language changes.
export const Typography = TypographyByLanguage.ar;
