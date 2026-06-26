export const Colors = {
  // Brand – Indigo-Violet system
  primary: '#312E81',        // Indigo-800
  primaryDark: '#1E1B4B',    // Indigo-950
  primaryLight: '#4C1D95',   // Violet-800
  secondary: '#06B6D4',      // Cyan-500
  secondaryDark: '#0891B2',  // Cyan-600
  secondaryLight: '#22D3EE', // Cyan-400
  accent: '#7C3AED',         // Violet-600

  // Semantic
  success: '#16A34A',
  successLight: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerDark: '#DC2626',
  pending: '#F59E0B',

  // Backgrounds
  background: '#F0F4FF',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFE',
  overlay: 'rgba(0,0,0,0.5)',

  // Neutral scale (Slate)
  neutral50: '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Text
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  // Bottom navigation
  navBackground: '#1E293B',
  navActive: '#06B6D4',
  navInactive: '#64748B',

  // Rotating group accent colours (deterministic per group ID)
  groupAccents: ['#06B6D4', '#7C3AED', '#EF4444', '#F59E0B', '#16A34A', '#F97316'],
} as const;
