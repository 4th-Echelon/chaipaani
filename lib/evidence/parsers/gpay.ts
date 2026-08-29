import { GenericCsvParser } from "./genericCsv";

/** Google Pay (Takeout) activity CSV: Time, Title/Description, Amount, UPI transaction ID. */
export class GPayParser extends GenericCsvParser {
  constructor() {
    super("gpay", {
      date: /^(time|date|timestamp)$/i,
      counterparty: /^(title|description|paid to|to)$/i,
      utr: /^(upi transaction id|transaction id|utr)$/i,
    });
  }
  canParse(bytes: Uint8Array, mime: string, filename: string): boolean {
    if (!super.canParse(bytes, mime, filename)) return false;
    const head = new TextDecoder().decode(bytes.subarray(0, 4096)).toLowerCase();
    return head.includes("google pay") || head.includes("upi transaction id") || /gpay/i.test(filename);
  }
}
