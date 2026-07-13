import { useTranslation } from 'react-i18next';

// Layout stays right-aligned/RTL-shaped regardless of language (a deliberate scope
// decision — see project notes), EXCEPT text input fields: typing English/numeric
// text into a right-aligned field feels broken (cursor position, digit flow), so
// inputs specifically flip to left-aligned in English.
export function useInputTextAlign(): 'left' | 'right' {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? 'left' : 'right';
}
