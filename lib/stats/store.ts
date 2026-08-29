/**
 * Persistence for precomputed statistics. Public pages read these rows
 * (one indexed lookup) instead of running aggregate SQL per request.
 * No dependency on lib/data.ts so both sides can import this freely.
 */
import { inArray, sql } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { statsSnapshots } from "../db/schema";

export const SNAPSHOT_KEYS = ["site", "states", "cities", "refusal", "depts", "trending"] as const;
export type SnapshotKey = (typeof SNAPSHOT_KEYS)[number];

export interface SnapshotRow<T = unknown> {
  key: SnapshotKey;
  value: T;
  computedMs: number;
  updatedAt: Date;
}

/** One SELECT for any number of keys. */
export async function readSnapshots(keys: readonly SnapshotKey[], db?: Db): Promise<SnapshotRow[]> {
  const d = db ?? (await getDb());
  if (!keys.length) return [];
  const rows = await d.select().from(statsSnapshots).where(inArray(statsSnapshots.key, [...keys]));
  return rows.map((r) => ({
    key: r.key as SnapshotKey,
    value: r.value,
    computedMs: r.computedMs,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(String(r.updatedAt)),
  }));
}

export async function upsertSnapshot(key: SnapshotKey, value: unknown, computedMs: number, db?: Db): Promise<void> {
  const d = db ?? (await getDb());
  await d
    .insert(statsSnapshots)
    .values({ key, value, computedMs, updatedAt: new Date() })
    .onConflictDoUpdate({ target: statsSnapshots.key, set: { value, computedMs, updatedAt: sql`now()` } });
}

/** Seconds since the oldest stored snapshot, or null when none exist yet. */
export async function snapshotAgeSeconds(db?: Db): Promise<number | null> {
  const d = db ?? (await getDb());
  const [row] = await d.select({ oldest: sql<Date | string | null>`min(${statsSnapshots.updatedAt})` }).from(statsSnapshots);
  if (!row?.oldest) return null;
  const t = row.oldest instanceof Date ? row.oldest.getTime() : new Date(String(row.oldest)).getTime();
  return Math.max(0, Math.round((Date.now() - t) / 1000));
}
