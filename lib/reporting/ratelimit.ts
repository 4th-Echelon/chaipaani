/**
 * DB-backed fixed-window rate limiter keyed by (scope, hash). Windows are one
 * UTC day so they line up with the daily hash rotation.
 */
import { eq, lt } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { rateLimits } from "../db/schema";

export type Scope = "reports" | "votes" | "evidence" | "takedowns";

const DEFAULTS: Record<Scope, number> = { reports: 3, votes: 20, evidence: 5, takedowns: 2 };
const WINDOW_MS = 86_400_000;

export function limitFor(scope: Scope): number {
  const env =
    scope === "reports"
      ? process.env.REPORTS_PER_DAY
      : scope === "votes"
        ? process.env.VOTES_PER_DAY
        : scope === "evidence"
          ? process.env.EVIDENCE_PER_DAY
          : process.env.TAKEDOWNS_PER_DAY;
  const n = Number(env);
  return Number.isFinite(n) && n > 0 ? n : DEFAULTS[scope];
}

export interface LimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Consumes one unit if allowed. */
export async function consume(scope: Scope, hash: string, db?: Db, now: Date = new Date()): Promise<LimitResult> {
  const d = db ?? (await getDb());
  const key = `${scope}:${hash}`;
  const limit = limitFor(scope);
  const nowMs = now.getTime();
  const row = (await d.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1))[0];
  let count = 0;
  let windowStart = now;
  if (row && nowMs - row.windowStart.getTime() < WINDOW_MS) {
    count = row.count;
    windowStart = row.windowStart;
  }
  if (count >= limit) {
    const retry = Math.max(1, Math.ceil((windowStart.getTime() + WINDOW_MS - nowMs) / 1000));
    return { ok: false, remaining: 0, retryAfterSeconds: retry };
  }
  count += 1;
  await d
    .insert(rateLimits)
    .values({ key, windowStart, count })
    .onConflictDoUpdate({ target: rateLimits.key, set: { windowStart, count } });
  // Opportunistic cleanup of stale windows.
  if (Math.random() < 0.05) await d.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(nowMs - 2 * WINDOW_MS)));
  return { ok: true, remaining: limit - count, retryAfterSeconds: 0 };
}
