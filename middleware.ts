import { NextRequest, NextResponse } from "next/server";

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

// Per-instance throttle for failed admin logins: 10 failures per 15 minutes per client.
const FAILS = new Map<string, { n: number; until: number }>();
const FAIL_LIMIT = 10;
const FAIL_WINDOW_MS = 15 * 60_000;

function clientKey(req: NextRequest): string {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.ip ?? "unknown";
}

export function middleware(req: NextRequest) {
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
  const fail = () => {
    const cur = FAILS.get(key);
    if (!cur || now > cur.until) FAILS.set(key, { n: 1, until: now + FAIL_WINDOW_MS });
    else cur.n += 1;
    if (FAILS.size > 5000) FAILS.clear();
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
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
