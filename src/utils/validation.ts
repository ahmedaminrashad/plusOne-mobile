export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/\s/g, ''));
}

export function isValidDisplayName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

export function isValidInstaPayAlias(alias: string): boolean {
  return /^[a-zA-Z0-9._@-]{3,50}$/.test(alias);
}

export function formatPhone(phone: string, countryCode = '+20'): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) return `${countryCode}${cleaned.slice(1)}`;
  if (cleaned.startsWith(countryCode.replace('+', ''))) return `+${cleaned}`;
  return `${countryCode}${cleaned}`;
}
