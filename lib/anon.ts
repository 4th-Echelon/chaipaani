import { createHmac } from "crypto";

/**
 * One-way hash of the client IP, keyed by a secret and the current UTC date.
 * The key rotates daily, so the hash cannot link a reporter across days and
 * cannot be reversed. It exists only to rate-limit spam. Raw IPs are never stored.
 */
export function hashIp(ip: string, now: Date = new Date()): string {
  const secret = process.env.IP_HASH_SECRET ?? "dev-only-secret";
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", `${secret}:${day}`).update(ip).digest("hex").slice(0, 32);
}

export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "0.0.0.0";
}

export function rateLimitPerHour(): number {
  const n = Number(process.env.RATE_LIMIT_PER_HOUR ?? 5);
  return Number.isFinite(n) && n > 0 ? n : 5;
}
