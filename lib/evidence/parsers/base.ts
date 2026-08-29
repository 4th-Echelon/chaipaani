/**
 * Pluggable transaction parsers. A parser turns an uploaded export (CSV or PDF)
 * into normalised transactions IN MEMORY. Nothing here touches disk or logs.
 */
export interface Transaction {
  date: string; // ISO yyyy-mm-dd
  amount: number; // INR, positive integer (rupees; paise dropped)
  counterparty: string;
  utr?: string;
  upiId?: string;
  direction?: "debit" | "credit";
}

export interface ParseResult {
  provider: string;
  transactions: Transaction[];
  warnings: string[];
}

export interface TransactionParser {
  readonly name: string;
  canParse(bytes: Uint8Array, mime: string, filename: string): boolean;
  parse(bytes: Uint8Array): Promise<ParseResult>;
}

// ---- shared helpers ----

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Accepts dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy, yyyy-mm-dd, "16 Aug 2026", "Aug 16, 2026". */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,5})[a-z]*,?\s+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase().slice(0, 4)] !== undefined) {
    const mo = MONTHS[m[2].toLowerCase().slice(0, 4)] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    return `${m[3]}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase().slice(0, 3)];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

/** "₹5,000.00", "Rs. 5000", "-5,000", "5000 DR" -> 5000 */
export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[₹,\s]|rs\.?|inr/gi, "");
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Math.abs(Math.round(parseFloat(m[0])));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const UTR_RE = /\b\d{12}\b/;
export const UPI_ID_RE = /\b[\w.-]{2,}@[a-z]{2,}\b/i;

export function normaliseCounterparty(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9@\s]/g, " ")
    .replace(/\b(pvt|ltd|private|limited|llp|upi|paid to|to|from|payment|transfer)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
