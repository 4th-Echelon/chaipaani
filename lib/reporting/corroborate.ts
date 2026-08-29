/**
 * Corroboration: independent reports that cluster around the same office,
 * service and month raise each other's tier from "reported" to "corroborated".
 * Never called "verified": a cluster shows a pattern, not proof.
 */
import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb, type Db } from "../db/client";
import { reports } from "../db/schema";

export const CLUSTER_WINDOW_DAYS = 30;
export const CLUSTER_MIN_REPORTS = 3;
export const CLUSTER_MIN_DISTINCT_HASHES = 3;

export function normaliseService(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

export function normaliseCity(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Row {
  id: string;
  departmentId: number;
  cityId: number | null;
  cityText: string;
  service: string | null;
  incidentDate: string;
  ipHash: string | null;
  tier: "reported" | "corroborated" | "evidence_backed";
  clusterId: string | null;
}

function sameCity(a: Row, b: Row): boolean {
  if (a.cityId && b.cityId) return a.cityId === b.cityId;
  return normaliseCity(a.cityText) === normaliseCity(b.cityText);
}

/** Attach `reportId` to a cluster (or create one) and promote tiers if the cluster qualifies. Returns cluster size. */
export async function corroborate(reportId: string, db?: Db): Promise<{ clusterId: string; size: number; corroborated: boolean }> {
  const d = db ?? (await getDb());
  const me = (await d.select().from(reports).where(eq(reports.id, reportId)).limit(1))[0] as Row | undefined;
  if (!me) throw new Error("Report not found");

  const candidates = (await d
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.departmentId, me.departmentId),
        eq(reports.status, "published"),
        ne(reports.id, me.id),
        gte(reports.incidentDate, shiftDate(me.incidentDate, -CLUSTER_WINDOW_DAYS)),
        lte(reports.incidentDate, shiftDate(me.incidentDate, CLUSTER_WINDOW_DAYS)),
      ),
    )) as Row[];

  const svc = normaliseService(me.service);
  const peers = candidates.filter((c) => sameCity(c, me) && normaliseService(c.service) === svc);

  // Reuse the most common existing cluster id among peers, else mint one.
  const counts = new Map<string, number>();
  for (const p of peers) if (p.clusterId) counts.set(p.clusterId, (counts.get(p.clusterId) ?? 0) + 1);
  let clusterId = me.clusterId ?? null;
  if (counts.size) clusterId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (!clusterId) clusterId = randomUUID();

  const memberIds = [me.id, ...peers.map((p) => p.id)];
  await d.update(reports).set({ clusterId, updatedAt: new Date() }).where(inArray(reports.id, memberIds));

  const members = [me, ...peers];
  const distinct = new Set(members.map((m) => m.ipHash ?? m.id)).size;
  const qualifies = members.length >= CLUSTER_MIN_REPORTS && distinct >= CLUSTER_MIN_DISTINCT_HASHES;
  if (qualifies) {
    await d
      .update(reports)
      .set({ tier: "corroborated", updatedAt: new Date() })
      .where(and(inArray(reports.id, memberIds), eq(reports.tier, "reported")));
  }
  return { clusterId, size: members.length, corroborated: qualifies };
}

/** Recompute clusters for every published report (job). */
export async function recomputeAll(db?: Db): Promise<{ reports: number; clusters: number }> {
  const d = db ?? (await getDb());
  await d.update(reports).set({ clusterId: null }).where(eq(reports.status, "published"));
  await d.update(reports).set({ tier: "reported" }).where(and(eq(reports.status, "published"), eq(reports.tier, "corroborated")));
  const ids = await d.select({ id: reports.id }).from(reports).where(eq(reports.status, "published"));
  const clusters = new Set<string>();
  for (const { id } of ids) clusters.add((await corroborate(id, d)).clusterId);
  return { reports: ids.length, clusters: clusters.size };
}

export { sql };
