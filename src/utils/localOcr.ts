import TextRecognition from '@react-native-ml-kit/text-recognition';
import { BillLineItem, PrefilledBillData, TaxServiceType } from '../types/models';

const BIDI_MARKS = /[\u200e\u200f\u202a-\u202e]/g;
const UNIT_TOKEN = '(?:Pcs?|Pes|Pos|PCs|pcs|kg|Kg|KG|g|جم)';
const MONEY = '(\\d{1,3}(?:[.,]\\d{3})*[.,]\\d{2}|\\d+[.,]\\d{2})';
const QTY = '(\\d+(?:[.,]\\d+)?)';

/** Metro Egypt / Carrefour-style: lineTotal qty unitPrice Unit */
const METRO_LTR_RE = new RegExp(
  `^${MONEY}\\s+${QTY}\\s+${MONEY}\\s+${UNIT_TOKEN}\\b`,
  'i',
);
/** Same row after RTL reordering: Unit unitPrice qty lineTotal */
const METRO_RTL_RE = new RegExp(
  `^${UNIT_TOKEN}\\s+${MONEY}\\s+${QTY}\\s+${MONEY}\\b`,
  'i',
);

const WESTERN_QTY_RE = new RegExp(
  `^(.+?)\\s+${QTY}\\s*[xX×]\\s*${MONEY}$`,
);
const WESTERN_ITEM_RE = new RegExp(`^(.+?)\\s+${MONEY}$`);

const LABELED_RE =
  /^(tax|vat|delivery|service|tip|total|grand\s*total|الضريبة|ضريبة|القيمة\s*المضافة|التوصيل|خدمة|الإجمالي|اجمالي|الاجمالي)\s*[:.]?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2}|\d+%?)$/i;

const DISCOUNT_RE = /^\(?\s*(\d+[.,]\d{2})\s*\)?\s*.*$/;
const FOOTER_RE =
  /thank\s*you|come\s*back|cash\s*card|ec\s*cash|رقم\s*ضريب|سجل\s*تجار|وفرت|الأصناف|مرتجع|Shopping/i;

function cleanLine(raw: string): string {
  return raw.replace(BIDI_MARKS, '').replace(/\s+/g, ' ').trim();
}

export function parseMoney(raw: string): number | null {
  let s = raw.replace(/[^\d.,]/g, '');
  if (!s) return null;

  if (/,/.test(s) && /\./.test(s)) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (/,/.test(s) && !/\./.test(s)) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      s = parts.join('');
    } else {
      s = s.replace(',', '.');
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseQty(raw: string): number | null {
  const n = parseMoney(raw);
  return n != null && n > 0 ? n : null;
}

function looksLikePriceOnlyLine(line: string): boolean {
  return (
    METRO_LTR_RE.test(line) ||
    METRO_RTL_RE.test(line) ||
    /^[\d.,\s()%PCSkgKGPesPos×xX\-]+$/.test(line)
  );
}

function isFooterOrNoise(line: string): boolean {
  if (FOOTER_RE.test(line)) return true;
  if (/^[%=*_./\\-]{1,8}$/.test(line)) return true;
  return false;
}

function isLikelyNameLine(line: string): boolean {
  if (!line || line.length < 2 || line.length > 80) return false;
  if (looksLikePriceOnlyLine(line)) return false;
  if (LABELED_RE.test(line)) return false;
  if (isFooterOrNoise(line)) return false;
  // Skip barcode / SKU heavy lines
  const digits = line.replace(/\D/g, '').length;
  if (digits / line.length > 0.45) return false;
  // Need some letters (Latin or Arabic)
  return /[A-Za-z\u0600-\u06FF]/.test(line);
}

/**
 * Heuristic receipt parser for Western receipts and Metro-style Egyptian receipts
 * (columns: line total · qty · unit price · unit, often with Arabic names on adjacent lines).
 */
export function parseReceiptText(text: string): PrefilledBillData {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const lineItems: BillLineItem[] = [];
  let tax: number | undefined;
  let taxType: TaxServiceType | undefined;
  let delivery: number | undefined;
  let deliveryType: TaxServiceType | undefined;
  let vat: number | undefined;
  let vatType: TaxServiceType | undefined;
  let venueName: string | undefined;
  let pendingName: string | undefined;
  let itemIndex = 0;

  const pushItem = (name: string | undefined, qty: number, unitPrice: number) => {
    itemIndex += 1;
    const resolved =
      (name && name.trim()) ||
      pendingName ||
      `Item ${itemIndex}`;
    pendingName = undefined;
    lineItems.push({
      name: resolved.replace(/\s+/g, ' ').trim(),
      qty,
      unitPrice: Math.round(unitPrice * 100) / 100,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!venueName && i < 4 && isLikelyNameLine(line) && !/\d{2,}[.,]\d{2}/.test(line)) {
      venueName = line;
      continue;
    }

    if (isFooterOrNoise(line)) continue;

    const labeled = line.match(LABELED_RE);
    if (labeled) {
      const key = labeled[1].toLowerCase().replace(/\s+/g, '');
      const rawVal = labeled[2];
      const isPercent = rawVal.includes('%');
      const value = parseMoney(rawVal.replace('%', ''));
      if (value == null) continue;
      const type: TaxServiceType = isPercent ? 'percent' : 'amount';
      if (key.includes('vat') || key.includes('قيمة') || key.includes('مضاف')) {
        vat = value;
        vatType = type;
      } else if (
        key.includes('tax') ||
        key.includes('ضريب') ||
        key === 'الضريبة'
      ) {
        tax = value;
        taxType = type;
      } else if (
        key.includes('delivery') ||
        key.includes('service') ||
        key.includes('توصيل') ||
        key.includes('خدمة')
      ) {
        delivery = value;
        deliveryType = type;
      }
      // total / الإجمالي ignored here — items already capture spend
      continue;
    }

    const metroLtr = line.match(METRO_LTR_RE);
    if (metroLtr) {
      const lineTotal = parseMoney(metroLtr[1]);
      const qty = parseQty(metroLtr[2]);
      const unitPrice = parseMoney(metroLtr[3]);
      if (lineTotal != null && qty != null && unitPrice != null) {
        // Prefer explicit unit price; fall back to total/qty when OCR swapped columns
        const price =
          Math.abs(unitPrice * qty - lineTotal) / Math.max(lineTotal, 1) < 0.15
            ? unitPrice
            : lineTotal / qty;
        pushItem(pendingName, qty, price);
      }
      continue;
    }

    const metroRtl = line.match(METRO_RTL_RE);
    if (metroRtl) {
      const unitPrice = parseMoney(metroRtl[1]);
      const qty = parseQty(metroRtl[2]);
      const lineTotal = parseMoney(metroRtl[3]);
      if (lineTotal != null && qty != null && unitPrice != null) {
        const price =
          Math.abs(unitPrice * qty - lineTotal) / Math.max(lineTotal, 1) < 0.15
            ? unitPrice
            : lineTotal / qty;
        pushItem(pendingName, qty, price);
      }
      continue;
    }

    // Standalone discount like "(7.00)" — apply to previous item when sensible
    if (/^\(?\d+[.,]\d{2}\)?$/.test(line) || /^\d+[.,]\d{2}\)\s*/.test(line)) {
      const disc = line.match(DISCOUNT_RE);
      const discount = disc ? parseMoney(disc[1]) : null;
      const prev = lineItems[lineItems.length - 1];
      if (discount != null && prev) {
        const lineTotal = prev.unitPrice * prev.qty;
        if (discount < lineTotal) {
          prev.unitPrice =
            Math.round(((lineTotal - discount) / prev.qty) * 100) / 100;
        }
      }
      continue;
    }

    const qtyMatch = line.match(WESTERN_QTY_RE);
    if (qtyMatch) {
      const qty = parseQty(qtyMatch[2]);
      const price = parseMoney(qtyMatch[3]);
      const name = qtyMatch[1].trim();
      if (qty != null && price != null && name.length > 1) {
        pushItem(name, qty, price);
      }
      continue;
    }

    const itemMatch = line.match(WESTERN_ITEM_RE);
    if (itemMatch) {
      const price = parseMoney(itemMatch[2]);
      const name = itemMatch[1].trim();
      // Avoid treating bare money rows / short codes as items
      if (
        price != null &&
        name.length > 1 &&
        /[A-Za-z\u0600-\u06FF]/.test(name) &&
        !/^(Pcs?|Pes|Pos|kg)$/i.test(name)
      ) {
        pushItem(name, 1, price);
        continue;
      }
    }

    if (isLikelyNameLine(line)) {
      pendingName = line;
    }
  }

  return {
    venueName,
    lineItems,
    tax,
    taxType,
    delivery,
    deliveryType,
    vat,
    vatType,
    captureMethod: 'ocr',
    sourceRef: 'mlkit-on-device',
  };
}

/** Runs on-device ML Kit OCR on a local image URI, then parses receipt text. */
export async function recognizeReceiptImage(imageUri: string): Promise<PrefilledBillData> {
  // ML Kit accepts file:// URIs from the image picker on both platforms.
  const result = await TextRecognition.recognize(imageUri);
  const parsed = parseReceiptText(result.text || '');
  if ((parsed.lineItems?.length ?? 0) === 0 && result.blocks?.length) {
    // Fallback: flatten blocks/lines in case full `text` is sparse
    const fromBlocks = result.blocks
      .flatMap((b) => b.lines?.map((l) => l.text) ?? [b.text])
      .join('\n');
    return parseReceiptText(fromBlocks);
  }
  return parsed;
}
