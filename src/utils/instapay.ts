// InstaPay resolves Egyptian mobile numbers in local 0-prefixed format (e.g. "01001234567"),
// not the "+20"/"20" international format we accept when the user enters their InstaPay ID —
// sending the international form as the receiver identifier causes InstaPay to reject the link.
// Non-phone aliases (usernames, IPAs) are passed through unchanged.
export function normalizeInstaPayIdentifier(alias: string): string {
  const trimmed = alias.trim();
  if (!/^\+?\d{7,15}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/^\+/, '');
  if (digits.startsWith('20')) return `0${digits.slice(2)}`;
  if (digits.startsWith('0')) return digits;
  return `0${digits}`;
}

// InstaPay's official Payment Link format (universal link — routes into the
// InstaPay/bank app if installed, else opens in the browser). It only encodes the
// recipient alias; amount and reference (if any) are not part of the link and must
// be entered by the payer once inside the app.
export function buildInstaPayLink(alias: string): string {
  return `https://ipn.eg/S/${encodeURIComponent(normalizeInstaPayIdentifier(alias))}`;
}
