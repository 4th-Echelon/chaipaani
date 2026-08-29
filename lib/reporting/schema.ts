import { z } from "zod";
import { DEPARTMENT_SEED, resolveStateCode } from "../db/taxonomy";

export interface FieldError {
  field: string;
  message: string;
}

const DEPT_SLUGS = DEPARTMENT_SEED.map((d) => d.slug) as [string, ...string[]];

function isoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const reportInputSchema = z
  .object({
    report_type: z.enum(["paid", "refused"]),
    department_slug: z.enum(DEPT_SLUGS, { message: "Unknown department" }),
    service: opt(80),
    official_role: opt(60),
    amount: z.coerce.number().int().min(1, "Amount must be at least 1 rupee").max(10_000_000, "Amount is unrealistically large").optional(),
    mode: z.enum(["cash", "upi", "other"]).optional(),
    state: z.string().trim().min(1, "State is required"),
    city: z.string().trim().min(2, "City is required").max(60),
    date: z.string().refine(isoDate, "Date must be yyyy-mm-dd"),
    outcome: z.enum(["done", "partial", "not_done"]),
    note: z.string().trim().min(20, "Describe what happened in at least 20 characters").max(2000, "Keep the description under 2000 characters"),
    consent: z.literal(true, { message: "You must accept the terms" }),
    turnstile_token: z.string().max(4096).optional(),
    lang: z.string().max(8).optional(),
  });

export type ReportInput = z.infer<typeof reportInputSchema>;

/** Cross-field rules, evaluated on the raw body so they report even when a base field is also invalid. */
function crossFieldErrors(raw: unknown): FieldError[] {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  if (typeof v.state === "string" && v.state && !resolveStateCode(v.state)) errors.push({ field: "state", message: "Unknown state" });
  if (v.report_type === "paid") {
    if (v.amount === undefined || v.amount === null || v.amount === "") errors.push({ field: "amount", message: "Amount is required for a paid bribe" });
    if (!v.mode) errors.push({ field: "mode", message: "Payment mode is required" });
  }
  if (typeof v.date === "string" && isoDate(v.date)) {
    const t = Date.parse(v.date + "T00:00:00Z");
    const now = Date.now();
    if (t > now + 86_400_000) errors.push({ field: "date", message: "Date cannot be in the future" });
    if (t < now - 5 * 365.25 * 86_400_000) errors.push({ field: "date", message: "Date must be within the last five years" });
  }
  return errors;
}

export function validateReportInput(body: unknown): { ok: true; value: ReportInput } | { ok: false; errors: FieldError[] } {
  const res = reportInputSchema.safeParse(body);
  const errors: FieldError[] = res.success ? [] : res.error.issues.map((i) => ({ field: i.path.map(String).join(".") || "body", message: i.message }));
  for (const e of crossFieldErrors(body)) if (!errors.some((x) => x.field === e.field)) errors.push(e);
  if (res.success && errors.length === 0) return { ok: true, value: res.data };
  return { ok: false, errors };
}

/** Frontend outcome + report type -> stored outcome enum. */
export type DbOutcome = "completed" | "partial" | "not_completed" | "refused_got_service" | "refused_denied";
export function toDbOutcome(reportType: "paid" | "refused", outcome: "done" | "partial" | "not_done"): DbOutcome {
  if (reportType === "refused") return outcome === "not_done" ? "refused_denied" : outcome === "partial" ? "partial" : "refused_got_service";
  return outcome === "done" ? "completed" : outcome === "partial" ? "partial" : "not_completed";
}
export function fromDbOutcome(o: string): "done" | "partial" | "not_done" {
  if (o === "completed" || o === "refused_got_service") return "done";
  if (o === "partial") return "partial";
  return "not_done";
}
