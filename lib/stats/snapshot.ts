/**
 * Refreshes every precomputed statistic. Runs from the cron route, the CLI
 * job, and the debounced trigger after writes. Each key is computed on its
 * own with a hard time budget so one slow aggregate cannot block the rest.
 */
import { getDb, type Db } from "../db/client";
import { computeCityStats, computeDeptStats, computeRefusalStats, computeSiteStats, computeStateStats, computeTrending, invalidateCache } from "../data";
import { SNAPSHOT_KEYS, upsertSnapshot, type SnapshotKey } from "./store";

export { readSnapshots, snapshotAgeSeconds, SNAPSHOT_KEYS } from "./store";

export const REFRESH_BUDGET_MS = Number(process.env.STATS_REFRESH_BUDGET_MS ?? 20_000);
/** Rows kept per list-shaped snapshot; readers slice to their own limit. */
export const CITY_SNAPSHOT_LIMIT = 50;
export const TRENDING_SNAPSHOT_LIMIT = 12;

export interface RefreshSummary {
  key: SnapshotKey;
  ms: number;
  ok: boolean;
  error?: string;
}

function bounded<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} exceeded ${ms} ms`)), ms);
    t.unref?.();
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

const COMPUTE: Record<SnapshotKey, (db: Db) => Promise<unknown>> = {
  site: computeSiteStats,
  states: computeStateStats,
  cities: (db) => computeCityStats(db, CITY_SNAPSHOT_LIMIT),
  refusal: computeRefusalStats,
  depts: computeDeptStats,
  trending: (db) => computeTrending(db, TRENDING_SNAPSHOT_LIMIT),
};

/** Compute one key live and store it. Returns the value. */
export async function refreshSnapshot(key: SnapshotKey, db?: Db, budgetMs = REFRESH_BUDGET_MS): Promise<{ value: unknown; ms: number }> {
  const d = db ?? (await getDb());
  const t0 = Date.now();
  const value = await bounded(COMPUTE[key](d), budgetMs, `snapshot ${key}`);
  const ms = Date.now() - t0;
  await upsertSnapshot(key, value, ms, d);
  return { value, ms };
}

/** Recompute every snapshot sequentially. Never throws; failures are reported per key. */
export async function refreshSnapshots(db?: Db, keys: readonly SnapshotKey[] = SNAPSHOT_KEYS): Promise<RefreshSummary[]> {
  const d = db ?? (await getDb());
  const out: RefreshSummary[] = [];
  for (const key of keys) {
    const t0 = Date.now();
    try {
      const { ms } = await refreshSnapshot(key, d);
      out.push({ key, ms, ok: true });
    } catch (err) {
      out.push({ key, ms: Date.now() - t0, ok: false, error: (err as Error).message });
    }
  }
  invalidateCache();
  return out;
}
