/**
 * Attach UPI evidence to a report. The upload is parsed entirely in memory;
 * only the matched transaction's hashed UTR, amount and date are stored.
 */
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { evidenceMatches, reports } from "../db/schema";
import { invalidateCache, loadDepartments, rowToReport } from "../data";
import { bestMatch, MATCH_THRESHOLD, type MatchScore } from "./matcher";
import { normaliseCounterparty, type TransactionParser } from "./parsers/base";
import { pickParser } from "./registry";

export const MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME = ["text/csv", "application/csv", "text/plain", "application/pdf", "application/vnd.ms-excel"];

export type AttachResult =
  | { ok: true; matched: true; score: number; tier: "evidence_backed"; provider: string; transactions_seen: number }
  | { ok: true; matched: false; best_score: number; provider: string; transactions_seen: number; warnings: string[] }
  | { ok: false; status: 400 | 404 | 409 | 413 | 415; message: string };

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function attachEvidence(
  reportRef: string,
  file: { bytes: Uint8Array; mime: string; filename: string },
  db?: Db,
  parsers?: TransactionParser[],
): Promise<AttachResult> {
  if (file.bytes.byteLength > MAX_BYTES) return { ok: false, status: 413, message: "File is larger than 5 MB" };
  if (!ALLOWED_MIME.includes(file.mime.split(";")[0].trim().toLowerCase()) && !/\.(csv|pdf)$/i.test(file.filename)) {
    return { ok: false, status: 415, message: "Upload a CSV or PDF export from your UPI app or bank" };
  }
  const d = db ?? (await getDb());
  await loadDepartments(d);
  const isUuid = /^[0-9a-f-]{36}$/i.test(reportRef);
  const row = (await d.select().from(reports).where(isUuid ? eq(reports.id, reportRef) : eq(reports.publicId, reportRef.toUpperCase())).limit(1))[0];
  if (!row || row.status === "removed") return { ok: false, status: 404, message: "Report not found" };
  if (row.reportType !== "paid" || !row.amount) return { ok: false, status: 400, message: "Evidence can only be attached to a paid report" };
  if (row.tier === "evidence_backed") return { ok: false, status: 409, message: "This report already has evidence attached" };

  const parser = pickParser(file.bytes, file.mime, file.filename, parsers);
  if (!parser) return { ok: false, status: 415, message: "Could not recognise this file format" };
  const parsed = await parser.parse(file.bytes);
  const report = rowToReport(row);
  const target = { amount: row.amount, incidentDate: String(row.incidentDate), words: [report.department, report.service ?? "", report.officialRole ?? ""] };
  const best: MatchScore | null = bestMatch(parsed.transactions, target);
  if (!best || best.score < MATCH_THRESHOLD) {
    return { ok: true, matched: false, best_score: best?.score ?? 0, provider: parsed.provider, transactions_seen: parsed.transactions.length, warnings: parsed.warnings };
  }
  const utrHash = sha256(best.transaction.utr ?? `${best.transaction.date}|${best.transaction.amount}|${normaliseCounterparty(best.transaction.counterparty)}`);
  const dup = await d.select({ id: evidenceMatches.id }).from(evidenceMatches).where(eq(evidenceMatches.utrHash, utrHash)).limit(1);
  if (dup.length) return { ok: false, status: 409, message: "This transaction is already attached to another report" };
  await d.insert(evidenceMatches).values({
    reportId: row.id,
    utrHash,
    amount: best.transaction.amount,
    txnDate: best.transaction.date,
    counterpartyNorm: normaliseCounterparty(best.transaction.counterparty).slice(0, 80) || null,
    matchScore: best.score,
  });
  await d.update(reports).set({ tier: "evidence_backed", updatedAt: new Date() }).where(eq(reports.id, row.id));
  invalidateCache();
  return { ok: true, matched: true, score: best.score, tier: "evidence_backed", provider: parsed.provider, transactions_seen: parsed.transactions.length };
}
