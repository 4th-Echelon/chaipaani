import type { TransactionParser } from "./parsers/base";
import { GenericCsvParser } from "./parsers/genericCsv";
import { GPayParser } from "./parsers/gpay";
import { PdfTextParser } from "./parsers/pdfText";
import { PhonePeParser } from "./parsers/phonepe";

/** Order matters: provider-specific parsers first, generic fallbacks last. */
export const PARSERS: TransactionParser[] = [new PhonePeParser(), new GPayParser(), new GenericCsvParser(), new PdfTextParser()];

export function pickParser(bytes: Uint8Array, mime: string, filename: string, parsers: TransactionParser[] = PARSERS): TransactionParser | null {
  return parsers.find((p) => p.canParse(bytes, mime, filename)) ?? null;
}
