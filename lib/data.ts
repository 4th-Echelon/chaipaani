/**
 * Data layer. Everything the app reads goes through `store` (DataStore),
 * backed by Drizzle on PostgreSQL (DATABASE_URL) or PGlite (local/test).
 * Writes that need policy (submission, votes, moderation) live in lib/reporting
 * and lib/admin; the store only exposes plain reads plus a low-level insert.
 */
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { getDb, rowsOf, type Db } from "./db/client";
import { cities, departments, reports, states } from "./db/schema";
import { DEPARTMENT_SEED, STATE_NAMES, resolveStateCode, stateName } from "./db/taxonomy";
import { slugify } from "./format";
import { fromDbOutcome } from "./reporting/schema";
import type { CityStat, Department, DeptStat, RefusalStat, Report, ReportQuery, SiteStats, StateStat } from "./types";

export const DEPARTMENTS: Department[] = DEPARTMENT_SEED.map((d) => ({ ...d }));
export const STATES: string[] = STATE_NAMES;

export interface DataStore {
  listReports(q: ReportQuery & { includeHeld?: boolean }): Promise<{ reports: Report[]; total: number; page: number; limit: number }>;
  getReport(id: string, opts?: { includeHeld?: boolean }): Promise<Report | null>;
  siteStats(): Promise<SiteStats>;
  stateStats(): Promise<StateStat[]>;
  cityStats(limit?: number): Promise<CityStat[]>;
  refusalStats(): Promise<RefusalStat[]>;
  deptStats(): Promise<DeptStat[]>;
  deptStat(slug: string): Promise<DeptStat | null>;
  trending(limit?: number): Promise<Report[]>;
  invalidate(): void;
}

// ---------- row mapping ----------

const deptById = new Map<number, Department>();
const deptIdBySlug = new Map<string, number>();

export async function loadDepartments(db: Db): Promise<void> {
  if (deptById.size) return;
  const rows = await db.select().from(departments);
  for (const r of rows) {
    deptById.set(r.id, { slug: r.slug, name: r.name, short: r.short });
    deptIdBySlug.set(r.slug, r.id);
  }
}
export async function departmentId(db: Db, slug: string): Promise<number | null> {
  await loadDepartments(db);
  return deptIdBySlug.get(slug) ?? null;
}

type Row = typeof reports.$inferSelect;

export function rowToReport(r: Row, clusterSize?: number): Report {
  const d = deptById.get(r.departmentId);
  return {
    id: r.id,
    publicId: r.publicId,
    reportType: r.reportType,
    departmentSlug: d?.slug ?? "other",
    department: d?.name ?? "Other",
    service: r.service ?? undefined,
    officialRole: r.officialRole ?? undefined,
    amount: r.amount ?? 0,
    mode: r.mode ?? undefined,
    state: stateName(r.stateCode),
    stateCode: r.stateCode,
    city: r.cityText,
    date: String(r.incidentDate),
    note: r.note ?? undefined,
    outcome: fromDbOutcome(r.outcome),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    helpfulCount: r.helpfulCount,
    fakeCount: r.fakeCount,
    status: r.status,
    tier: r.tier,
    clusterSize,
  };
}

// ---------- cache ----------

const TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}
export function invalidateCache(): void {
  cache.clear();
}
/** Test helper: forget the department id map (a fresh DB may renumber it). */
export function _resetDeptCache(): void {
  deptById.clear();
  deptIdBySlug.clear();
}

// ---------- helpers ----------

const n = (v: unknown) => Number(v ?? 0);

export function createDbStore(): DataStore {
  const db = () => getDb();

  return {
    invalidate: invalidateCache,

    async listReports(q) {
      const d = await db();
      await loadDepartments(d);
      const page = Math.max(1, q.page ?? 1);
      const limit = Math.min(100, Math.max(1, q.limit ?? 20));
      const where = [] as any[];
      where.push(q.includeHeld ? inArray(reports.status, ["published", "held"]) : eq(reports.status, "published"));
      const sc = resolveStateCode(q.state);
      if (q.state) where.push(sc ? eq(reports.stateCode, sc) : sql`false`);
      if (q.dept) {
        const id = deptIdBySlug.get(q.dept);
        where.push(id ? eq(reports.departmentId, id) : sql`false`);
      }
      if (q.city) where.push(ilike(reports.cityText, q.city));
      if (q.type) where.push(eq(reports.reportType, q.type));
      if (q.minAmount) where.push(gte(reports.amount, q.minAmount));
      if (q.maxAmount) where.push(lte(reports.amount, q.maxAmount));
      if (q.q) {
        const needle = `%${q.q}%`;
        const ids = [...deptById.entries()].filter(([, dd]) => dd.name.toLowerCase().includes(q.q!.toLowerCase())).map(([id]) => id);
        where.push(
          or(
            ilike(reports.service, needle),
            ilike(reports.cityText, needle),
            ilike(reports.note, needle),
            ilike(reports.officialRole, needle),
            ids.length ? inArray(reports.departmentId, ids) : sql`false`,
          ),
        );
      }
      const cond = and(...where);
      const [{ total }] = await d.select({ total: count() }).from(reports).where(cond);
      const rows = await d
        .select()
        .from(reports)
        .where(cond)
        .orderBy(desc(reports.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
      return { reports: rows.map((r) => rowToReport(r)), total: Number(total), page, limit };
    },

    async getReport(id, opts) {
      const d = await db();
      await loadDepartments(d);
      const isUuid = /^[0-9a-f-]{36}$/i.test(id);
      const row = (
        await d
          .select()
          .from(reports)
          .where(isUuid ? eq(reports.id, id) : eq(reports.publicId, id.toUpperCase()))
          .limit(1)
      )[0];
      if (!row) return null;
      if (row.status === "removed") return null;
      if (row.status === "held" && !opts?.includeHeld) return null;
      let size: number | undefined;
      if (row.clusterId) {
        const [{ c }] = await d.select({ c: count() }).from(reports).where(and(eq(reports.clusterId, row.clusterId), eq(reports.status, "published")));
        size = Number(c);
      }
      return rowToReport(row, size);
    },

    siteStats: () =>
      cached("site", async () => {
        const d = await db();
        await loadDepartments(d);
        const pub = eq(reports.status, "published");
        const [{ total }] = await d.select({ total: count() }).from(reports).where(pub);
        const [{ cities: c }] = await d
          .select({ cities: sql<number>`count(distinct lower(${reports.cityText}) || '|' || ${reports.stateCode})` })
          .from(reports)
          .where(pub);
        const [ref] = await d
          .select({
            refused: count(),
            got: sql<number>`count(*) filter (where ${reports.outcome} = 'refused_got_service')`,
          })
          .from(reports)
          .where(and(pub, eq(reports.reportType, "refused")));
        const top = await d
          .select({ id: reports.departmentId, c: count() })
          .from(reports)
          .where(pub)
          .groupBy(reports.departmentId)
          .orderBy(desc(count()))
          .limit(5);
        const latest = (await d.select().from(reports).where(and(pub, eq(reports.reportType, "paid"))).orderBy(desc(reports.createdAt)).limit(1))[0];
        const featured = (await d.select().from(reports).where(and(pub, eq(reports.reportType, "paid"))).orderBy(desc(reports.amount)).limit(1))[0];
        return {
          totalReports: Number(total),
          citiesCovered: n(c),
          refusedGotServiceRate: n(ref?.refused) ? n(ref.got) / n(ref.refused) : 0,
          topDepartments: top.map((t) => ({ slug: deptById.get(t.id)?.slug ?? "other", name: deptById.get(t.id)?.name ?? "Other", count: Number(t.c) })),
          latest: latest ? rowToReport(latest) : undefined,
          featured: featured ? rowToReport(featured) : undefined,
        } satisfies SiteStats;
      }),

    stateStats: () =>
      cached("states", async () => {
        const d = await db();
        await loadDepartments(d);
        const rows = rowsOf<{ state_code: string; c: number; avg_amount: number | null; refusal_rate: number; top_dept: number | null }>(
          await d.execute(sql`
            with pub as (
              select state_code, report_type, amount, department_id from reports where status = 'published'
            ),
            agg as (
              select state_code,
                     count(*)::int as c,
                     round(avg(amount) filter (where report_type = 'paid'))::int as avg_amount,
                     (count(*) filter (where report_type = 'refused'))::float / count(*) as refusal_rate
              from pub group by state_code
            ),
            top as (
              select distinct on (state_code) state_code, department_id
              from (select state_code, department_id, count(*) as dc from pub group by state_code, department_id) t
              order by state_code, dc desc, department_id
            )
            select agg.state_code, agg.c, agg.avg_amount, agg.refusal_rate, top.department_id as top_dept
            from agg left join top using (state_code)
            order by agg.c desc, agg.state_code asc`),
        );
        return rows.map((r) => ({
          state: stateName(r.state_code),
          count: n(r.c),
          avgAmount: n(r.avg_amount),
          refusalRate: n(r.refusal_rate),
          topDepartment: r.top_dept ? deptById.get(Number(r.top_dept))?.name : undefined,
        })) satisfies StateStat[];
      }),

    cityStats: (limit = 10) =>
      cached(`cities:${limit}`, async () => {
        const d = await db();
        await loadDepartments(d);
        const rows = rowsOf<{ city: string; state_code: string; c: number; total: number; top_dept: number | null }>(
          await d.execute(sql`
            with pub as (
              select lower(city_text) as ck, city_text as city, state_code, amount, department_id
              from reports where status = 'published'
            ),
            agg as (
              select ck, min(city) as city, state_code, count(*)::int as c, coalesce(sum(amount),0)::bigint as total
              from pub group by ck, state_code
            ),
            top as (
              select distinct on (ck, state_code) ck, state_code, department_id
              from (select ck, state_code, department_id, count(*) as dc from pub group by ck, state_code, department_id) t
              order by ck, state_code, dc desc, department_id
            )
            select agg.city, agg.state_code, agg.c, agg.total, top.department_id as top_dept
            from agg left join top using (ck, state_code)
            order by agg.total desc limit ${limit}`),
        );
        return rows.map((r) => ({
          city: r.city,
          state: stateName(r.state_code),
          count: n(r.c),
          totalAmount: n(r.total),
          topDepartment: r.top_dept ? deptById.get(Number(r.top_dept))?.name : undefined,
        })) satisfies CityStat[];
      }),

    refusalStats: () =>
      cached("refusal", async () => {
        const d = await db();
        const rows = rowsOf<{ state_code: string; refused: number; got: number }>(
          await d.execute(sql`
            select state_code, count(*)::int as refused, (count(*) filter (where outcome = 'refused_got_service'))::int as got
            from reports where status = 'published' and report_type = 'refused'
            group by state_code`),
        );
        return rows
          .map((r) => ({ state: stateName(r.state_code), refused: n(r.refused), gotService: n(r.got), successRate: n(r.refused) ? n(r.got) / n(r.refused) : 0 }))
          .sort((a, b) => b.successRate - a.successRate || b.refused - a.refused) satisfies RefusalStat[];
      }),

    deptStats: () =>
      cached("depts", async () => {
        const d = await db();
        await loadDepartments(d);
        const rows = rowsOf<{ department_id: number; c: number; avg_amount: number | null; median_amount: number | null; refused: number; got: number }>(
          await d.execute(sql`
            select department_id, count(*)::int as c,
                   round(avg(amount) filter (where report_type='paid'))::int as avg_amount,
                   (percentile_cont(0.5) within group (order by amount) filter (where report_type='paid'))::int as median_amount,
                   (count(*) filter (where report_type='refused'))::int as refused,
                   (count(*) filter (where outcome='refused_got_service'))::int as got
            from reports where status='published' group by department_id`),
        );
        const by = new Map(rows.map((r) => [Number(r.department_id), r]));
        return DEPARTMENTS.filter((x) => x.slug !== "other")
          .map((x) => {
            const r = by.get(deptIdBySlug.get(x.slug) ?? -1);
            const c = n(r?.c);
            return {
              slug: x.slug,
              name: x.name,
              count: c,
              avgAmount: n(r?.avg_amount),
              medianAmount: n(r?.median_amount),
              refusalRate: c ? n(r?.refused) / c : 0,
              refusalSuccessRate: n(r?.refused) ? n(r?.got) / n(r?.refused) : 0,
            };
          })
          .sort((a, b) => b.count - a.count) satisfies DeptStat[];
      }),

    async deptStat(slug) {
      return (await this.deptStats()).find((x) => x.slug === slug) ?? null;
    },

    trending: (limit = 5) =>
      cached(`trending:${limit}`, async () => {
        const d = await db();
        await loadDepartments(d);
        const rows = await d
          .select()
          .from(reports)
          .where(eq(reports.status, "published"))
          .orderBy(desc(reports.helpfulCount), desc(reports.amount), asc(reports.createdAt))
          .limit(limit);
        return rows.map((r) => rowToReport(r));
      }),
  };
}

// Module-level singleton. In dev, Next may re-evaluate modules; pin to globalThis.
const g = globalThis as unknown as { __cpStore?: DataStore };
export const store: DataStore = g.__cpStore ?? (g.__cpStore = createDbStore());

export function departmentBySlug(slug: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.slug === slug);
}
export { slugify, cities, states };
