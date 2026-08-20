import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import arCommon from './locales/ar/common.json';
import arErrors from './locales/ar/errors.json';
import arBilling from './locales/ar/billing.json';
import arGroups from './locales/ar/groups.json';
import arSettings from './locales/ar/settings.json';
import arAuth from './locales/ar/auth.json';
import arNavigation from './locales/ar/navigation.json';

import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enBilling from './locales/en/billing.json';
import enGroups from './locales/en/groups.json';
import enSettings from './locales/en/settings.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';

export type AppLanguage = 'ar' | 'en';

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: DEFAULT_LANGUAGE,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'errors', 'billing', 'groups', 'settings', 'auth', 'navigation'],
  resources: {
    ar: {
      common: arCommon,
      errors: arErrors,
      billing: arBilling,
      groups: arGroups,
      settings: arSettings,
      auth: arAuth,
      navigation: arNavigation,
    },
    en: {
      common: enCommon,
      errors: enErrors,
      billing: enBilling,
      groups: enGroups,
      settings: enSettings,
      auth: enAuth,
      navigation: enNavigation,
    },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

export async function changeLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  const { AppStorage } = await import('../utils/storage');
  await AppStorage.setLanguage(language);
}

export default i18n;
