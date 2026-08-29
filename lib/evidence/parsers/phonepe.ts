import { GenericCsvParser } from "./genericCsv";

/** PhonePe statement export: Date, Transaction Details, Type, Amount, Transaction ID / UTR. */
export class PhonePeParser extends GenericCsvParser {
  constructor() {
    super("phonepe", {
      date: /^(date|transaction date)$/i,
      counterparty: /^(transaction details|details|paid to|name)$/i,
      utr: /^(utr|utr no\.?|transaction id)$/i,
      type: /^(type|transaction type)$/i,
    });
  }
  canParse(bytes: Uint8Array, mime: string, filename: string): boolean {
    if (!super.canParse(bytes, mime, filename)) return false;
    const head = new TextDecoder().decode(bytes.subarray(0, 4096)).toLowerCase();
    return head.includes("phonepe") || /transaction details/.test(head);
  }
}
