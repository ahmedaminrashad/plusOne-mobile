import { useTranslation } from 'react-i18next';
import { TypographyByLanguage } from '../constants/typography';
import { resolveAppLanguage } from '../i18n';

// Sora/Figtree have no Arabic glyphs, so the active font family must switch with
// the language rather than staying fixed — mirrors the useInputTextAlign() pattern
// in utils/rtl.ts.
export function useTypography() {
  const { i18n } = useTranslation();
  return TypographyByLanguage[resolveAppLanguage(i18n.language)];
}
