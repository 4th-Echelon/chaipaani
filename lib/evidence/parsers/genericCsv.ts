import { type ParseResult, type Transaction, type TransactionParser, parseAmount, parseDate, UPI_ID_RE, UTR_RE } from "./base";

/** Minimal RFC4180 CSV reader (quotes, escaped quotes, CRLF). */
export function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export interface ColumnMap {
  date: RegExp;
  amount: RegExp;
  debit?: RegExp;
  credit?: RegExp;
  counterparty: RegExp;
  utr?: RegExp;
  upiId?: RegExp;
  type?: RegExp;
}

const DEFAULT_MAP: ColumnMap = {
  date: /^(txn\s*)?(date|time|timestamp|transaction date|value date)$/i,
  amount: /^(amount|txn amount|transaction amount|amt|value)$/i,
  debit: /^(debit|withdrawal|dr|paid|sent)/i,
  credit: /^(credit|deposit|cr|received)/i,
  counterparty: /^(name|payee|paid to|to|recipient|beneficiary|counterparty|description|narration|details|remarks|particulars)$/i,
  utr: /^(utr|utr no\.?|utr number|reference|ref no\.?|reference no\.?|transaction id|txn id|rrn|upi ref(erence)? (id|no)?)$/i,
  upiId: /^(upi id|vpa|upi handle|payee vpa)$/i,
  type: /^(type|txn type|transaction type|dr\/cr)$/i,
};

export class GenericCsvParser implements TransactionParser {
  readonly name: string;
  protected map: ColumnMap;
  constructor(name = "generic-csv", map: Partial<ColumnMap> = {}) {
    this.name = name;
    this.map = { ...DEFAULT_MAP, ...map };
  }

  canParse(bytes: Uint8Array, mime: string, filename: string): boolean {
    if (/csv|text\/plain/i.test(mime) || /\.csv$/i.test(filename)) {
      const head = new TextDecoder().decode(bytes.subarray(0, 4096)).toLowerCase();
      return /date|amount|utr|transaction/.test(head);
    }
    return false;
  }

  /** Allow subclasses to detect their provider from the header row. */
  protected matchesHeader(_header: string[]): boolean {
    return true;
  }

  async parse(bytes: Uint8Array): Promise<ParseResult> {
    const text = new TextDecoder().decode(bytes);
    const rows = readCsv(text);
    const warnings: string[] = [];
    if (!rows.length) return { provider: this.name, transactions: [], warnings: ["Empty file"] };

    // header row = first row with >=3 cells that matches at least date+amount-ish columns
    let hIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const cells = rows[i].map((c) => c.trim());
      const hasDate = cells.some((c) => this.map.date.test(c));
      const hasAmt = cells.some((c) => this.map.amount.test(c) || this.map.debit?.test(c) || this.map.credit?.test(c));
      if (hasDate && hasAmt) { hIdx = i; break; }
    }
    const header = rows[hIdx].map((c) => c.trim());
    const col = (re?: RegExp) => (re ? header.findIndex((h) => re.test(h)) : -1);
    const ci = {
      date: col(this.map.date), amount: col(this.map.amount), debit: col(this.map.debit), credit: col(this.map.credit),
      counterparty: col(this.map.counterparty), utr: col(this.map.utr), upiId: col(this.map.upiId), type: col(this.map.type),
    };
    if (ci.date < 0) warnings.push("No date column found");
    if (ci.amount < 0 && ci.debit < 0) warnings.push("No amount column found");

    const out: Transaction[] = [];
    for (const r of rows.slice(hIdx + 1)) {
      const get = (i: number) => (i >= 0 && i < r.length ? r[i].trim() : "");
      const date = parseDate(get(ci.date));
      let amount = parseAmount(get(ci.amount));
      let direction: Transaction["direction"] | undefined;
      if (ci.debit >= 0 || ci.credit >= 0) {
        const d = parseAmount(get(ci.debit));
        const c = parseAmount(get(ci.credit));
        if (d) { amount = d; direction = "debit"; } else if (c) { amount = c; direction = "credit"; }
      }
      const typ = get(ci.type).toLowerCase();
      if (typ) direction = /debit|dr|paid|sent/.test(typ) ? "debit" : /credit|cr|received/.test(typ) ? "credit" : direction;
      if (!date || !amount) continue;
      const line = r.join(" ");
      const utr = get(ci.utr).match(UTR_RE)?.[0] ?? line.match(UTR_RE)?.[0];
      const upiId = get(ci.upiId).match(UPI_ID_RE)?.[0] ?? line.match(UPI_ID_RE)?.[0];
      out.push({ date, amount, counterparty: get(ci.counterparty) || "", utr, upiId, direction });
    }
    if (!out.length) warnings.push("No transactions could be read");
    return { provider: this.name, transactions: out, warnings };
  }
}
