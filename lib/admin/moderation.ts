import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { moderationLog, reports, takedowns } from "../db/schema";
import { invalidateCache, loadDepartments, rowToReport } from "../data";
import { corroborate } from "../reporting/corroborate";
import { scrub } from "../reporting/pii";
import type { Report } from "../types";

export type ModAction = "publish" | "remove" | "hold";

async function findReport(d: Db, ref: string) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(ref);
  return (await d.select().from(reports).where(isUuid ? eq(reports.id, ref) : eq(reports.publicId, ref.toUpperCase())).limit(1))[0];
}

export async function queue(status: "held" | "published" | "removed" = "held", db?: Db, limit = 100) {
  const d = db ?? (await getDb());
  await loadDepartments(d);
  const rows = await d.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt)).limit(limit);
  const out: (Report & { scrub: ReturnType<typeof scrub>; ip_hash_prefix: string; last_reason: string | null })[] = [];
  for (const r of rows) {
    let size = 0;
    if (r.clusterId) {
      const [{ c }] = await d.select({ c: count() }).from(reports).where(and(eq(reports.clusterId, r.clusterId), eq(reports.status, "published")));
      size = Number(c);
    }
    const last = (await d.select().from(moderationLog).where(eq(moderationLog.reportId, r.id)).orderBy(desc(moderationLog.createdAt)).limit(1))[0];
    out.push({ ...rowToReport(r, size), scrub: scrub(r.note ?? ""), ip_hash_prefix: (r.ipHash ?? "").slice(0, 8), last_reason: last?.reason ?? null });
  }
  return out;
}

export async function act(ref: string, action: ModAction, actor: string, reason: string | undefined, db?: Db) {
  const d = db ?? (await getDb());
  const r = await findReport(d, ref);
  if (!r) return null;
  const next = action === "publish" ? "published" : action === "remove" ? "removed" : "held";
  await d.update(reports).set({ status: next, updatedAt: new Date() }).where(eq(reports.id, r.id));
  await d.insert(moderationLog).values({ reportId: r.id, actor, action, reason: reason ?? null, before: { status: r.status }, after: { status: next } });
  if (next === "published") await corroborate(r.id, d);
  invalidateCache();
  return { id: r.id, public_id: r.publicId, status: next };
}

const EDITABLE = ["service", "officialRole", "amount", "mode", "cityText", "incidentDate", "note", "outcome", "lang"] as const;
type Editable = (typeof EDITABLE)[number];

export async function edit(ref: string, patch: Partial<Record<Editable, unknown>>, actor: string, reason: string | undefined, db?: Db) {
  const d = db ?? (await getDb());
  const r = await findReport(d, ref);
  if (!r) return null;
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const set: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (k in patch && patch[k] !== undefined) {
      before[k] = (r as any)[k];
      after[k] = k === "note" || k === "officialRole" || k === "service" ? scrub(String(patch[k])).text : patch[k];
      set[k] = after[k];
    }
  }
  if (!Object.keys(set).length) return { id: r.id, public_id: r.publicId, changed: [] };
  await d.update(reports).set({ ...set, updatedAt: new Date() }).where(eq(reports.id, r.id));
  await d.insert(moderationLog).values({ reportId: r.id, actor, action: "edit", reason: reason ?? null, before, after });
  invalidateCache();
  return { id: r.id, public_id: r.publicId, changed: Object.keys(set) };
}

export async function log(limit = 200, db?: Db) {
  const d = db ?? (await getDb());
  return d.select().from(moderationLog).orderBy(desc(moderationLog.createdAt)).limit(limit);
}

export async function fileTakedown(input: { report: string; requester_kind: string; contact?: string; reason: string }, db?: Db) {
  const d = db ?? (await getDb());
  const r = await findReport(d, input.report);
  if (!r || r.status === "removed") return null;
  const [t] = await d
    .insert(takedowns)
    .values({ reportId: r.id, requesterKind: input.requester_kind, requesterContact: input.contact ?? null, reason: input.reason })
    .returning({ id: takedowns.id });
  if (r.status === "published") {
    await d.update(reports).set({ status: "held", updatedAt: new Date() }).where(eq(reports.id, r.id));
    await d.insert(moderationLog).values({ reportId: r.id, actor: "system", action: "hold", reason: `takedown:${t.id}` });
    invalidateCache();
  }
  return { takedown_id: t.id, report_public_id: r.publicId, status: "held" };
}

export async function listTakedowns(db?: Db, open = true) {
  const d = db ?? (await getDb());
  const rows = await d.select().from(takedowns).orderBy(desc(takedowns.receivedAt)).limit(200);
  return open ? rows.filter((t) => !t.decision) : rows;
}

export async function decideTakedown(id: number, decision: "upheld" | "rejected", actor: string, notes: string | undefined, db?: Db) {
  const d = db ?? (await getDb());
  const t = (await d.select().from(takedowns).where(eq(takedowns.id, id)).limit(1))[0];
  if (!t) return null;
  await d.update(takedowns).set({ decision, decidedAt: new Date(), notes: notes ?? null }).where(eq(takedowns.id, id));
  const res = await act(t.reportId, decision === "upheld" ? "remove" : "publish", actor, `takedown:${id}:${decision}`, d);
  return { takedown_id: id, decision, report: res };
}

export { inArray };
