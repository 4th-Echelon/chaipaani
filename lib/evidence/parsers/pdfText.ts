import { type ParseResult, type Transaction, type TransactionParser, parseAmount, parseDate, UPI_ID_RE, UTR_RE } from "./base";

/**
 * Best-effort PDF statement parser. Extracts text with pdf-parse, then scans
 * each line for a date, an amount and (optionally) a 12-digit UTR.
 * `extractText` is injectable so tests do not need a real PDF.
 */
export type TextExtractor = (bytes: Uint8Array) => Promise<string>;

/** Statement PDFs are a handful of pages; anything beyond this is not a UPI export. */
export const MAX_PDF_PAGES = 30;
/** Hard wall-clock cap for text extraction, so a malformed PDF cannot pin the worker. */
export const PDF_TIMEOUT_MS = 8_000;
/** A statement is a few KB of text. Anything past this is a decompression bomb, not a statement. */
export const MAX_PDF_TEXT_BYTES = 2 * 1024 * 1024;
export const PDF_TOO_LARGE_WARNING = "PDF text is too large to be a statement export";

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`PDF extraction exceeded ${ms} ms`));
    }, ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function defaultExtract(bytes: Uint8Array): Promise<string> {
  // Cheap structural sanity check before handing bytes to the parser.
  const head = Buffer.from(bytes.subarray(0, 8)).toString("latin1");
  if (!head.startsWith("%PDF-")) throw new Error("Not a PDF");
  const mod: any = await import("pdf-parse");
  // pdf-parse v2 exposes a PDFParse class; v1 exports a function. Support both.
  if (mod.PDFParse) {
    const p = new mod.PDFParse({ data: bytes });
    try {
      const res = await withTimeout<any>(p.getText({ last: MAX_PDF_PAGES }), PDF_TIMEOUT_MS, () => { void p.destroy?.(); });
      return typeof res === "string" ? res : res?.text ?? "";
    } finally {
      try { await p.destroy?.(); } catch { /* already destroyed */ }
    }
  }
  const fn = mod.default ?? mod;
  const res = await withTimeout<any>(fn(Buffer.from(bytes), { max: MAX_PDF_PAGES }), PDF_TIMEOUT_MS);
  return res?.text ?? "";
}

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/;
const AMOUNT_RE = /(?:\u20b9|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)|\b([\d,]{3,}(?:\.\d{2})?)\b(?=\s*(?:dr|cr|debit|credit|$))/i;

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
      .replace(/\u20b9|rs\.?|inr|debit|credit|\bdr\b|\bcr\b|paid to|upi/gi, " ")
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
    if (text.length > MAX_PDF_TEXT_BYTES) {
      return { provider: this.name, transactions: [], warnings: [PDF_TOO_LARGE_WARNING] };
    }
    const lower = text.toLowerCase();
    const provider = lower.includes("phonepe") ? "phonepe-pdf" : lower.includes("google pay") || lower.includes("gpay") ? "gpay-pdf" : lower.includes("paytm") ? "paytm-pdf" : this.name;
    return extractFromText(text, provider);
  }
}
