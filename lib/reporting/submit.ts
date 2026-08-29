/**
 * Report submission pipeline:
 *   validate -> turnstile -> rate limit -> PII scrub -> insert -> corroborate
 */
import { eq } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { cities, moderationLog, reports } from "../db/schema";
import { resolveStateCode } from "../db/taxonomy";
import { departmentId, invalidateCache } from "../data";
import { corroborate } from "./corroborate";
import { scrub } from "./pii";
import { uniquePublicId } from "./publicId";
import { consume } from "./ratelimit";
import { toDbOutcome, validateReportInput, type FieldError } from "./schema";
import { verifyTurnstile, type FetchLike } from "./turnstile";

export type SubmitResult =
  | { ok: true; status: 201; report: { id: string; public_id: string; status: "published" | "held"; tier: string; held_reason?: string; redactions: { kind: string; count: number }[] } }
  | { ok: false; status: 400; errors: FieldError[] }
  | { ok: false; status: 429; retryAfterSeconds: number; message: string };

export interface SubmitContext {
  ipHash: string;
  ip?: string;
  db?: Db;
  fetchImpl?: FetchLike;
  now?: Date;
}

export async function submitReport(body: unknown, ctx: SubmitContext): Promise<SubmitResult> {
  const v = validateReportInput(body);
  if (!v.ok) return { ok: false, status: 400, errors: v.errors };
  const input = v.value;
  const d = ctx.db ?? (await getDb());

  const ts = await verifyTurnstile(input.turnstile_token, ctx.ip, ctx.fetchImpl);
  if (!ts.ok) return { ok: false, status: 400, errors: [{ field: "turnstile_token", message: ts.error ?? "Human check failed" }] };

  const rl = await consume("reports", ctx.ipHash, d, ctx.now);
  if (!rl.ok) return { ok: false, status: 429, retryAfterSeconds: rl.retryAfterSeconds, message: "Too many reports from this network today. Try again tomorrow." };

  const note = scrub(input.note);
  const role = scrub(input.official_role);
  const service = scrub(input.service);
  const city = scrub(input.city);
  const possibleName = note.possibleName || role.possibleName || service.possibleName;
  const redactions = [...note.redactions, ...role.redactions, ...service.redactions, ...city.redactions];

  const stateCode = resolveStateCode(input.state)!;
  const deptId = await departmentId(d, input.department_slug);
  if (!deptId) return { ok: false, status: 400, errors: [{ field: "department_slug", message: "Unknown department" }] };
  const cityRow = (await d.select({ id: cities.id, name: cities.name }).from(cities).where(eq(cities.stateCode, stateCode))).find(
    (c) => c.name.toLowerCase() === city.text.toLowerCase(),
  );

  const publicId = await uniquePublicId(async (id) => (await d.select({ id: reports.id }).from(reports).where(eq(reports.publicId, id)).limit(1)).length > 0);
  const status = possibleName ? "held" : "published";
  const [row] = await d
    .insert(reports)
    .values({
      publicId,
      reportType: input.report_type,
      departmentId: deptId,
      service: service.text || null,
      officialRole: role.text || null,
      amount: input.report_type === "paid" ? input.amount! : null,
      mode: input.report_type === "paid" ? input.mode! : null,
      cityId: cityRow?.id ?? null,
      cityText: cityRow?.name ?? city.text,
      stateCode,
      incidentDate: input.date,
      outcome: toDbOutcome(input.report_type, input.outcome),
      note: note.text,
      lang: input.lang ?? "en",
      status,
      ipHash: ctx.ipHash,
      turnstileOk: !ts.skipped,
    })
    .returning({ id: reports.id });

  if (status === "held") {
    await d.insert(moderationLog).values({ reportId: row.id, actor: "system", action: "hold", reason: "possible_name" });
  }
  let tier = "reported";
  if (status === "published") {
    const c = await corroborate(row.id, d);
    if (c.corroborated) tier = "corroborated";
  }
  invalidateCache();
  return { ok: true, status: 201, report: { id: row.id, public_id: publicId, status, tier, held_reason: possibleName ? "possible_name" : undefined, redactions } };
}
