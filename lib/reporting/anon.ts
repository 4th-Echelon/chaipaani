/**
 * Anonymity primitives. The client IP is hashed with a key that rotates daily
 * and is deleted after two days, so stored hashes cannot be reversed or linked
 * across days. Raw IPs are never persisted or logged.
 */
import { createHmac, randomBytes } from "crypto";
import { eq, lt, sql } from "drizzle-orm";
import { getDb, type Db } from "../db/client";
import { hashKeys } from "../db/schema";

export function getClientIp(req: Request): string {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "0.0.0.0";
}

export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function minusDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const keyCache = new Map<string, string>();

/** Today's HMAC key, created on first use; keys older than 2 days are purged. */
export async function dailyKey(db?: Db, now: Date = new Date()): Promise<string> {
  const day = utcDay(now);
  const cached = keyCache.get(day);
  if (cached) return cached;
  const d = db ?? (await getDb());
  const existing = await d.select().from(hashKeys).where(eq(hashKeys.day, day)).limit(1);
  let key = existing[0]?.key;
  if (!key) {
    key = randomBytes(32).toString("hex");
    await d
      .insert(hashKeys)
      .values({ day, key })
      .onConflictDoNothing();
    const again = await d.select().from(hashKeys).where(eq(hashKeys.day, day)).limit(1);
    key = again[0]?.key ?? key;
  }
  await d.delete(hashKeys).where(lt(hashKeys.day, minusDays(day, 2)));
  keyCache.clear();
  keyCache.set(day, key);
  return key;
}

export async function ipHash(ip: string, db?: Db, now: Date = new Date()): Promise<string> {
  const key = await dailyKey(db, now);
  const secret = process.env.IP_HASH_SECRET ?? "";
  return createHmac("sha256", key + secret).update(ip).digest("hex");
}

export async function requestHash(req: Request, db?: Db): Promise<string> {
  return ipHash(getClientIp(req), db);
}

/** Test helper. */
export function _clearKeyCache(): void {
  keyCache.clear();
}

export { sql };
