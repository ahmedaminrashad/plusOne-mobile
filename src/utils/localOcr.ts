import { createWorker, Worker } from 'tesseract.js';
import { BillLineItem, PrefilledBillData, TaxServiceType } from '../types/models';

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        // Pull language data from the official Tesseract tessdata repo
        // (https://tesseractocr.org / tessdata_fast).
        langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int',
      });
      return worker;
    })();
  }
  return workerPromise;
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Heuristic receipt parser over OCR text.
 * Looks for "name ..... price" / "name  qty x price" patterns, plus Tax / VAT / Delivery / Total lines.
 */
export function parseReceiptText(text: string): PrefilledBillData {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const lineItems: BillLineItem[] = [];
  let tax: number | undefined;
  let taxType: TaxServiceType | undefined;
  let delivery: number | undefined;
  let deliveryType: TaxServiceType | undefined;
  let vat: number | undefined;
  let vatType: TaxServiceType | undefined;
  let venueName: string | undefined;

  const itemRe = /^(.+?)\s+(\d+[.,]\d{2})$/;
  const qtyRe = /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+[.,]\d{2})$/;
  const labeledRe = /^(tax|vat|delivery|service|tip|total|grand\s*total)\s*[:.]?\s*(\d+[.,]\d{2}|\d+%?)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!venueName && i < 3 && line.length > 2 && !/\d/.test(line) && line.length < 40) {
      venueName = line;
      continue;
    }

    const labeled = line.match(labeledRe);
    if (labeled) {
      const key = labeled[1].toLowerCase().replace(/\s+/g, '');
      const rawVal = labeled[2];
      const isPercent = rawVal.includes('%');
      const value = parseMoney(rawVal.replace('%', ''));
      if (value == null) continue;
      const type: TaxServiceType = isPercent ? 'percent' : 'amount';
      if (key === 'tax') { tax = value; taxType = type; }
      else if (key === 'vat') { vat = value; vatType = type; }
      else if (key === 'delivery' || key === 'service') { delivery = value; deliveryType = type; }
      else if (key === 'tip') { /* ignore legacy tip labels for OCR */ }
      continue;
    }

    const qtyMatch = line.match(qtyRe);
    if (qtyMatch) {
      const price = parseMoney(qtyMatch[3]);
      if (price != null) {
        lineItems.push({ name: qtyMatch[1].trim(), qty: parseInt(qtyMatch[2], 10) || 1, unitPrice: price });
      }
      continue;
    }

    const itemMatch = line.match(itemRe);
    if (itemMatch) {
      const price = parseMoney(itemMatch[2]);
      if (price != null && itemMatch[1].length > 1) {
        lineItems.push({ name: itemMatch[1].trim(), qty: 1, unitPrice: price });
      }
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
    sourceRef: 'tesseract-local',
  };
}

/** Runs local Tesseract OCR on an image URI or base64 data URL. */
export async function recognizeReceiptImage(imageUri: string): Promise<PrefilledBillData> {
  const worker = await getWorker();
  const result = await worker.recognize(imageUri);
  return parseReceiptText(result.data.text || '');
}
