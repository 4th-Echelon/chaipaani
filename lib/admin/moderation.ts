import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { moderationLog, reports, takedowns } from "../db/schema";
import { invalidateCache, loadDepartments, rowToReport } from "../data";
import { refreshStatsNow } from "../stats/trigger";
import { corroborate } from "../reporting/corroborate";
import { scrub } from "../reporting/pii";
import type { Report } from "../types";

export type ModAction = "publish" | "remove" | "hold";

async function findReport(d: Db, ref: string) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(ref);
  return (await d.select().from(reports).where(isUuid ? eq(reports.id, ref) : eq(reports.publicId, ref.toUpperCase())).limit(1))[0];
}

/** Number of reports per status, for the queue tabs. */
export async function queueCounts(db?: Db): Promise<Record<"held" | "published" | "removed", number>> {
  const d = db ?? (await getDb());
  const rows = await d.select({ status: reports.status, c: count() }).from(reports).groupBy(reports.status);
  const out = { held: 0, published: 0, removed: 0 } as Record<"held" | "published" | "removed", number>;
  for (const r of rows) out[r.status as keyof typeof out] = Number(r.c);
  return out;
}

export type QueueRow = Report & { scrub: ReturnType<typeof scrub>; ip_hash_prefix: string; last_reason: string | null };

/**
 * One page of the moderation queue. Three queries regardless of page size:
 * the page of reports, cluster sizes for those reports, and the latest log
 * entry per report (no per-row round trips, which timed out on serverless).
 */
export async function queue(
  status: "held" | "published" | "removed" = "held",
  db?: Db,
  limit = 25,
  page = 1,
): Promise<{ rows: QueueRow[]; total: number; page: number; pages: number; limit: number }> {
  const d = db ?? (await getDb());
  await loadDepartments(d);
  const [{ total }] = await d.select({ total: count() }).from(reports).where(eq(reports.status, status));
  const pages = Math.max(1, Math.ceil(Number(total) / limit));
  const p = Math.min(Math.max(1, page), pages);
  const rows = await d
    .select()
    .from(reports)
    .where(eq(reports.status, status))
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset((p - 1) * limit);
  if (rows.length === 0) return { rows: [], total: Number(total), page: p, pages, limit };

  const ids = rows.map((r) => r.id);
  const clusterIds = Array.from(new Set(rows.map((r) => r.clusterId).filter((c): c is string => Boolean(c))));
  const [sizes, lastLogs] = await Promise.all([
    clusterIds.length
      ? d
          .select({ clusterId: reports.clusterId, c: count() })
          .from(reports)
          .where(and(inArray(reports.clusterId, clusterIds), eq(reports.status, "published")))
          .groupBy(reports.clusterId)
      : Promise.resolve([] as { clusterId: string | null; c: number }[]),
    d
      .select({ reportId: moderationLog.reportId, reason: moderationLog.reason, createdAt: moderationLog.createdAt })
      .from(moderationLog)
      .where(inArray(moderationLog.reportId, ids))
      .orderBy(desc(moderationLog.createdAt)),
  ]);
  const sizeBy = new Map(sizes.map((s) => [s.clusterId as string, Number(s.c)]));
  const lastBy = new Map<string, string | null>();
  for (const l of lastLogs) if (l.reportId && !lastBy.has(l.reportId)) lastBy.set(l.reportId, l.reason ?? null); // already newest-first

  const out: QueueRow[] = rows.map((r) => ({
    ...rowToReport(r, r.clusterId ? sizeBy.get(r.clusterId) ?? 0 : 0),
    scrub: scrub(r.note ?? ""),
    ip_hash_prefix: (r.ipHash ?? "").slice(0, 8),
    last_reason: lastBy.get(r.id) ?? null,
  }));
  return { rows: out, total: Number(total), page: p, pages, limit };
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
  await refreshStatsNow();
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
  await refreshStatsNow();
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
  await refreshStatsNow();
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
