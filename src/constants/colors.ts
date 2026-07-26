export const Colors = {
  // Brand – Teal system (from Figma "+One Design")
  primary: '#14665D',        // Brand teal
  primaryDark: '#0E453F',    // Deep teal
  primaryLight: '#3E6B62',   // Muted teal (secondary buttons/tags)
  secondary: '#2E9B6E',      // Mint
  secondaryDark: '#1E7A54',  // Mint dark (positive amount text)
  secondaryLight: '#8FD9B6', // Mint light (on-dark accents)
  accent: '#E0A23E',         // Saffron (CTA highlight, FAB, scan frame)

  // Semantic
  success: '#2E9B6E',
  successLight: '#8FD9B6',
  warning: '#E0A23E',
  warningDark: '#9A6A1B',   // Text on warningTint pills (pending/link-opened/paid-count badges)
  danger: '#C24B31',
  dangerLight: '#D97656',
  dangerDark: '#9E3A24',
  pending: '#E0A23E',

  // Backgrounds
  background: '#F4F3EF',      // Canvas
  surface: '#FFFFFF',
  surfaceElevated: '#F1F6F5',
  tint: '#E0EBEA',             // Light teal tint (icon wraps, subtle highlights)
  overlay: 'rgba(0,0,0,0.5)',
  menuScrim: 'rgba(14,25,22,0.42)', // Quick-add backdrop (Figma: #0E1916 @ 42%)

  // Neutral scale (teal-tinted, replaces Slate)
  neutral50: '#F8F7F4',
  neutral100: '#F1F6F5',
  neutral200: '#E9E8E1',
  neutral300: '#D6D4CC',
  neutral400: '#98A19C',
  neutral500: '#66706B',
  neutral600: '#3E6B62',
  neutral700: '#0E453F',
  neutral800: '#0B1512',
  neutral900: '#182320',

  // Borders
  border: '#D6D4CC',
  borderLight: '#E9E8E1',

  // Text
  text: '#182320',           // Ink
  textSecondary: '#66706B',
  textMuted: '#98A19C',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#CFE0D8', // Muted mint text on dark/camera surfaces (QR/OCR capture hints)

  // Tinted surfaces for status badges/pills
  successTint: '#E1F2EA',
  warningTint: '#F8EEDC',
  dangerTint: '#F7E6E0',
  tileMyTab: '#ECEBE4',

  // Bottom navigation — frosted floating pill (Figma: #FFFFFF @ 94% opacity)
  navBackground: 'rgba(255,255,255,0.94)',
  navActive: '#14665D',
  navInactive: '#98A19C',
  navFabRing: '#F4F3EF',

  // Rotating group accent colours (deterministic per group ID)
  groupAccents: ['#14665D', '#2E9B6E', '#E0A23E', '#C24B31', '#5B5E8C', '#476B8A'],

  // Rotating avatar background colours (deterministic per user/member ID)
  avatarPalette: ['#A8763E', '#3E6B62', '#8A5A3B', '#5B5E8C', '#476B8A'],
} as const;

export function getAvatarColor(seed: string | null | undefined): string {
  const palette = Colors.avatarPalette;
  if (!seed) return palette[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}
