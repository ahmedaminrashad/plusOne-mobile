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

/** Round a money amount to exactly 2 decimal places (piastres). */
export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/** Format a number for money inputs / plain display — always `0.00` style. */
export function formatMoneyDigits(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '';
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
  if (!Number.isFinite(n)) return '';
  return roundMoney(n).toFixed(2);
}

/** Round a quantity that may be fractional (kg / weight items). Keeps 3 d.p. */
export function parseQty(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 1000) / 1000;
}

/** Allow digits + a single decimal separator while typing quantity. */
export function sanitizeQtyInput(raw: string): string {
  const normalized = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const firstDot = normalized.indexOf('.');
  if (firstDot === -1) return normalized;
  return normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '');
}

export function formatBillDisplayName(
  bill: { venueName?: string | null; title?: string | null; createdAt?: string },
  fallback: string,
): string {
  const venue = bill.venueName?.trim();
  if (venue) return venue;
  const title = bill.title?.trim();
  if (title && title !== 'إيصال' && title !== 'Receipt') return title;
  if (bill.createdAt) {
    const date = formatDate(bill.createdAt, { day: 'numeric', month: 'short' });
    return i18n.t('billing:viewReceipt.receiptDateFallback', { date, defaultValue: `Receipt · ${date}` });
  }
  return fallback;
}

function locale(): string {
  return i18n.language === 'en' ? 'en-US' : 'ar-EG';
}

export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  const amountText = roundMoney(Number(amount)).toFixed(2);
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
