import { NextRequest, NextResponse } from "next/server";
import { checkCsrfRequest } from "@/lib/admin/csrf";

/**
 * HTTP Basic auth for /admin and /api/admin. Edge-safe: no Node crypto here,
 * the constant-time check happens again in route handlers via lib/admin/auth.
 */
function decode(b64: string): string {
  try {
    return atob(b64);
  } catch {
    return "";
  }
}

// Per-instance throttle for failed admin logins. This counter lives in one
// serverless instance's memory; the production-grade layer is a Cloudflare
// rate-limiting rule on /admin* (see README, Security).
const FAILS = new Map<string, { n: number; until: number }>();
export const ADMIN_FAIL_LIMIT = 10;
export const ADMIN_FAIL_WINDOW_MS = 15 * 60_000;
export const ADMIN_FAIL_DELAY_MS = 300;
const FAIL_LIMIT = ADMIN_FAIL_LIMIT;
const FAIL_WINDOW_MS = ADMIN_FAIL_WINDOW_MS;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function clientKey(req: NextRequest): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.ip ?? "unknown";
}

export async function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  const challenge = () =>
    new NextResponse("Authentication required", { status: 401, headers: { "www-authenticate": 'Basic realm="Chai Paani moderation", charset="UTF-8"' } });
  if (!user || !pass) return challenge();
  // Credentials must never travel in clear text.
  if (process.env.NODE_ENV === "production" && req.headers.get("x-forwarded-proto") === "http") {
    return new NextResponse("HTTPS required", { status: 426, headers: { upgrade: "TLS/1.2" } });
  }
  const key = clientKey(req);
  const now = Date.now();
  const f = FAILS.get(key);
  if (f && f.n >= FAIL_LIMIT && now < f.until) {
    return new NextResponse("Too many failed attempts", { status: 429, headers: { "retry-after": String(Math.ceil((f.until - now) / 1000)) } });
  }
  const fail = async () => {
    const cur = FAILS.get(key);
    if (!cur || now > cur.until) FAILS.set(key, { n: 1, until: now + FAIL_WINDOW_MS });
    else cur.n += 1;
    if (FAILS.size > 5000) FAILS.clear();
    // Slow down guessing without affecting legitimate first requests (no header).
    await sleep(ADMIN_FAIL_DELAY_MS);
    return challenge();
  };
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return challenge();
  const [u, ...rest] = decode(h.slice(6)).split(":");
  const p = rest.join(":");
  if (u.length !== user.length || p.length !== pass.length) return fail();
  let diff = 0;
  for (let i = 0; i < user.length; i++) diff |= u.charCodeAt(i) ^ user.charCodeAt(i);
  for (let i = 0; i < pass.length; i++) diff |= p.charCodeAt(i) ^ pass.charCodeAt(i);
  if (diff !== 0) return fail();
  FAILS.delete(key);
  // Authenticated. State-changing requests must also originate from this site.
  const csrf = checkCsrfRequest(req);
  if (!csrf.ok) return new NextResponse("Cross-site request blocked", { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
