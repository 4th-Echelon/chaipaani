import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseAmount, parseDate } from "./parsers/base";
import { GenericCsvParser } from "./parsers/genericCsv";
import { extractFromText, PdfTextParser } from "./parsers/pdfText";
import { PhonePeParser } from "./parsers/phonepe";
import { pickParser } from "./registry";

const fx = (n: string) => new Uint8Array(readFileSync(path.join(__dirname, "..", "..", "tests", "fixtures", n)));

describe("helpers", () => {
  it("parses many date formats", () => {
    expect(parseDate("16/08/2026")).toBe("2026-08-16");
    expect(parseDate("16-08-26")).toBe("2026-08-16");
    expect(parseDate("2026-08-16 10:00")).toBe("2026-08-16");
    expect(parseDate("16 Aug 2026")).toBe("2026-08-16");
    expect(parseDate("Aug 16, 2026")).toBe("2026-08-16");
    expect(parseDate("nope")).toBeNull();
  });
  it("parses rupee amounts", () => {
    expect(parseAmount("₹5,000.00")).toBe(5000);
    expect(parseAmount("Rs. 250")).toBe(250);
    expect(parseAmount("-1,200")).toBe(1200);
    expect(parseAmount("")).toBeNull();
  });
});

describe("generic csv parser", () => {
  it("reads debit/credit columns, UTRs and directions", async () => {
    const bytes = fx("generic.csv");
    const p = pickParser(bytes, "text/csv", "statement.csv");
    expect(p).toBeInstanceOf(GenericCsvParser);
    const r = await p!.parse(bytes);
    expect(r.transactions).toHaveLength(4);
    const rto = r.transactions.find((t) => t.amount === 1000)!;
    expect(rto.date).toBe("2026-08-16");
    expect(rto.utr).toBe("622698765432");
    expect(rto.direction).toBe("debit");
    expect(rto.counterparty).toContain("RTO SERVICES");
    expect(r.transactions.find((t) => t.amount === 45000)!.direction).toBe("credit");
    expect(r.transactions.find((t) => t.amount === 2351)).toBeTruthy();
  });
});

describe("phonepe parser", () => {
  it("is selected for PhonePe exports and skips the preamble line", async () => {
    const bytes = fx("phonepe.csv");
    const p = pickParser(bytes, "text/csv", "PhonePe_Statement.csv");
    expect(p).toBeInstanceOf(PhonePeParser);
    const r = await p!.parse(bytes);
    expect(r.provider).toBe("phonepe");
    expect(r.transactions).toHaveLength(3);
    const eb = r.transactions.find((t) => /ELECTRICITY/.test(t.counterparty))!;
    expect(eb.amount).toBe(500);
    expect(eb.date).toBe("2026-08-16");
    expect(eb.direction).toBe("debit");
  });
});

describe("pdf text parser", () => {
  it("extracts date/amount/UTR rows from statement text", () => {
    const text = ["Statement of account", "16/08/2026 UPI/RTO SERVICES/okaxis 622698765432 Rs. 1,000.00 DR", "17/08/2026 UPI/Salary 622611112222 45,000.00 CR"].join("\n");
    const r = extractFromText(text);
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0]).toMatchObject({ date: "2026-08-16", amount: 1000, utr: "622698765432", direction: "debit" });
    expect(r.transactions[1].direction).toBe("credit");
  });
  it("uses the injected extractor and detects %PDF magic", async () => {
    const p = new PdfTextParser(async () => "16/08/2026 Paid to RTO 622698765432 ₹1,000");
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(p.canParse(bytes, "application/octet-stream", "x")).toBe(true);
    const r = await p.parse(bytes);
    expect(r.transactions[0].amount).toBe(1000);
  });
  it("reports a warning instead of throwing on unreadable PDFs", async () => {
    const p = new PdfTextParser(async () => {
      throw new Error("bad pdf");
    });
    const r = await p.parse(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    expect(r.transactions).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/Could not read/);
  });
});
