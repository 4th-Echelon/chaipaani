import { and, eq, sql } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { moderationLog, reports, votes } from "../db/schema";
import { invalidateCache } from "../data";
import { scheduleStatsRefresh } from "../stats/trigger";
import { consume } from "./ratelimit";

export const FAKE_HOLD_THRESHOLD = 5;

export type VoteResult =
  | { ok: true; id: string; public_id: string; helpful_count: number; fake_count: number; held: boolean }
  | { ok: false; status: 404 | 409 | 429; message: string; retryAfterSeconds?: number };

export async function castVote(reportRef: string, kind: "helpful" | "fake", voterHash: string, db?: Db, now?: Date): Promise<VoteResult> {
  const d = db ?? (await getDb());
  const isUuid = /^[0-9a-f-]{36}$/i.test(reportRef);
  const target = (
    await d
      .select({ id: reports.id, publicId: reports.publicId, status: reports.status })
      .from(reports)
      .where(isUuid ? eq(reports.id, reportRef) : eq(reports.publicId, reportRef.toUpperCase()))
      .limit(1)
  )[0];
  if (!target || target.status === "removed") return { ok: false, status: 404, message: "Report not found" };

  const rl = await consume("votes", voterHash, d, now);
  if (!rl.ok) return { ok: false, status: 429, message: "Too many votes today", retryAfterSeconds: rl.retryAfterSeconds };

  const inserted = await d.insert(votes).values({ reportId: target.id, kind, voterHash }).onConflictDoNothing().returning({ reportId: votes.reportId });
  if (!inserted.length) return { ok: false, status: 409, message: "Already voted" };

  const col = kind === "helpful" ? reports.helpfulCount : reports.fakeCount;
  const [row] = await d
    .update(reports)
    .set({ [kind === "helpful" ? "helpfulCount" : "fakeCount"]: sql`${col} + 1`, updatedAt: new Date() })
    .where(eq(reports.id, target.id))
    .returning({ helpful: reports.helpfulCount, fake: reports.fakeCount, status: reports.status });

  let held = false;
  if (kind === "fake" && row.status === "published" && row.fake >= FAKE_HOLD_THRESHOLD && row.fake > row.helpful) {
    await d.update(reports).set({ status: "held", updatedAt: new Date() }).where(and(eq(reports.id, target.id), eq(reports.status, "published")));
    await d.insert(moderationLog).values({ reportId: target.id, actor: "system", action: "hold", reason: `fake_flags:${row.fake}` });
    held = true;
  }
  invalidateCache();
  if (held) scheduleStatsRefresh();
  return { ok: true, id: target.id, public_id: target.publicId, helpful_count: row.helpful, fake_count: row.fake, held };
}
