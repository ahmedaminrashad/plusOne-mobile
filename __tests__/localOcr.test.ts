jest.mock('@react-native-ml-kit/text-recognition');

import { parseMoney, parseReceiptText } from '../src/utils/localOcr';

/** Sample Latin OCR output from a Metro Egypt-style receipt (eng-only OCR). */
const METRO_ENG_OCR = `
4042 88 Sua 0 ATS
67.90 2 33.95 Pcs
1708 5 Us sal) ee) >)
44.95 1 44.95 Pcs
(7.00)
al70 ey PBs sab alll
91.90 2 45.95 Pcs
(10.00)
Ji 330) 0 Li Sioa Sus
53.00 1 53.00 Pes
MEE) SE El =
23.00 1 85.00 Pcs
2500 3p Gerd gly MH
57.00 1 57.00 Pcs
Shaheen coffee 330
180.25 1 180.25 Pes
15.30 Foy
BR Eee
115.50 2 57.75 Pcs
15.60 Pore
833 He SRY
132.00 0.24 550.00 Kg
30.00 2 15.00 Pcs
36.00 2 18.00 Pos
Lhe od dad
430.00 2 215.00 Pes
5,787.80 ll 8
5,787.80 EC Cash Card wy
%
290.80 iia ads SRY
Thank you for your shopping!
We hope you'll come back soon.
`;

const WESTERN_OCR = `
Blue Bottle Cafe
Latte 2 x 45.00
Croissant 35.50
Tax 14%
VAT 12.00
Total 137.50
`;

describe('parseMoney', () => {
  it('parses decimals and thousands separators', () => {
    expect(parseMoney('67.90')).toBe(67.9);
    expect(parseMoney('5,787.80')).toBe(5787.8);
    expect(parseMoney('12,50')).toBe(12.5);
  });
});

describe('parseReceiptText', () => {
  it('extracts Metro-style line items from Latin OCR', () => {
    const parsed = parseReceiptText(METRO_ENG_OCR);
    expect(parsed.lineItems?.length).toBeGreaterThanOrEqual(10);
    expect(parsed.captureMethod).toBe('ocr');
    expect(parsed.sourceRef).toBe('mlkit-on-device');

    const first = parsed.lineItems![0];
    expect(first.qty).toBe(2);
    expect(first.unitPrice).toBe(33.95);

    const weighted = parsed.lineItems!.find((i) => i.qty === 0.24);
    expect(weighted).toBeTruthy();
    expect(weighted!.unitPrice).toBe(550);

    // Discount (7.00) applied to previous 44.95 line
    const discounted = parsed.lineItems!.find(
      (i) => i.qty === 1 && i.unitPrice === 37.95,
    );
    expect(discounted).toBeTruthy();
  });

  it('parses Western qty x price and labeled tax/VAT', () => {
    const parsed = parseReceiptText(WESTERN_OCR);
    expect(parsed.venueName).toMatch(/Blue Bottle/i);
    expect(parsed.lineItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Latte', qty: 2, unitPrice: 45 }),
        expect.objectContaining({ name: 'Croissant', qty: 1, unitPrice: 35.5 }),
      ]),
    );
    expect(parsed.tax).toBe(14);
    expect(parsed.taxType).toBe('percent');
    expect(parsed.vat).toBe(12);
    expect(parsed.vatType).toBe('amount');
  });

  it('handles RTL-reordered Metro rows', () => {
    const parsed = parseReceiptText('Pcs 33.95 2 67.90\nAlmarai yogurt');
    expect(parsed.lineItems?.[0]).toEqual(
      expect.objectContaining({ qty: 2, unitPrice: 33.95 }),
    );
  });
});
