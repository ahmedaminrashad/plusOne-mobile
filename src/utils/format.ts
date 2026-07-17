import i18n from '../i18n';
import { ASSET_BASE_URL } from '../config';

// Server-stored asset paths (e.g. group avatars) are relative — resolve them against
// the API host. Already-absolute URLs (http/https) and local picker URIs some callers
// pass for an in-progress preview are returned untouched.
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|file:|content:)/.test(url)) return url;
  return `${ASSET_BASE_URL}${url}`;
}

function locale(): string {
  return i18n.language === 'en' ? 'en-US' : 'ar-EG';
}

export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  const amountText = amount.toFixed(2);
  if (i18n.language === 'en') {
    return `${currency} ${amountText}`;
  }
  const currencyLabel = currency === 'EGP' ? i18n.t('common:currencyEGP') : currency;
  return `${amountText} ${currencyLabel}`;
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale(), options ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(locale(), options ?? { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return i18n.t('common:now');
    if (diffMin < 60) return i18n.t('common:minutesAgo', { count: diffMin });
    return i18n.t('common:hoursAgo', { count: Math.floor(diffMin / 60) });
  }

  return `${formatDate(d, { day: 'numeric', month: 'short' })} ${formatTime(d)}`;
}
