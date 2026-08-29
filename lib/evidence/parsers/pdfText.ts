import { type ParseResult, type Transaction, type TransactionParser, parseAmount, parseDate, UPI_ID_RE, UTR_RE } from "./base";

/**
 * Best-effort PDF statement parser. Extracts text with pdf-parse, then scans
 * each line for a date, an amount and (optionally) a 12-digit UTR.
 * `extractText` is injectable so tests do not need a real PDF.
 */
export type TextExtractor = (bytes: Uint8Array) => Promise<string>;

async function defaultExtract(bytes: Uint8Array): Promise<string> {
  const mod: any = await import("pdf-parse");
  // pdf-parse v2 exposes a PDFParse class; v1 exports a function. Support both.
  if (mod.PDFParse) {
    const p = new mod.PDFParse({ data: bytes });
    const res = await p.getText();
    await p.destroy?.();
    return typeof res === "string" ? res : res?.text ?? "";
  }
  const fn = mod.default ?? mod;
  const res = await fn(Buffer.from(bytes));
  return res?.text ?? "";
}

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/;
const AMOUNT_RE = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)|\b([\d,]{3,}(?:\.\d{2})?)\b(?=\s*(?:dr|cr|debit|credit|$))/i;

export function extractFromText(text: string, provider = "pdf"): ParseResult {
  const out: Transaction[] = [];
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    // Statements often wrap one transaction over 2-3 lines; join a small window.
    const window = [lines[i], lines[i + 1] ?? "", lines[i + 2] ?? ""].join(" ");
    const d = lines[i].match(DATE_RE);
    if (!d) continue;
    const date = parseDate(d[1]);
    const a = window.match(AMOUNT_RE);
    const amount = parseAmount(a?.[1] ?? a?.[2]);
    if (!date || !amount) continue;
    const utr = window.match(UTR_RE)?.[0];
    const upiId = window.match(UPI_ID_RE)?.[0];
    const counterparty = window
      .replace(DATE_RE, " ")
      .replace(AMOUNT_RE, " ")
      .replace(UTR_RE, " ")
      .replace(/₹|rs\.?|inr|debit|credit|\bdr\b|\bcr\b|paid to|upi/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const own = lines[i];
    const direction: Transaction["direction"] = /credit|\bcr\b|received/i.test(own)
      ? "credit"
      : /debit|\bdr\b|paid/i.test(own)
        ? "debit"
        : /credit|\bcr\b|received/i.test(window)
          ? "credit"
          : "debit";
    out.push({ date, amount, counterparty, utr, upiId, direction });
  }
  if (!out.length) warnings.push("No transaction lines recognised in PDF text");
  return { provider, transactions: out, warnings };
}

export class PdfTextParser implements TransactionParser {
  readonly name = "pdf-text";
  constructor(private extract: TextExtractor = defaultExtract) {}
  canParse(bytes: Uint8Array, mime: string, filename: string): boolean {
    const magic = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
    return magic || /pdf/i.test(mime) || /\.pdf$/i.test(filename);
  }
  async parse(bytes: Uint8Array): Promise<ParseResult> {
    let text = "";
    try {
      text = await this.extract(bytes);
    } catch {
      return { provider: this.name, transactions: [], warnings: ["Could not read PDF text (scanned image PDFs are not supported)"] };
    }
    const lower = text.toLowerCase();
    const provider = lower.includes("phonepe") ? "phonepe-pdf" : lower.includes("google pay") || lower.includes("gpay") ? "gpay-pdf" : lower.includes("paytm") ? "paytm-pdf" : this.name;
    return extractFromText(text, provider);
  }
}
