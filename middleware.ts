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

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  const challenge = () =>
    new NextResponse("Authentication required", { status: 401, headers: { "www-authenticate": 'Basic realm="Chai Paani moderation", charset="UTF-8"' } });
  if (!user || !pass) return challenge();
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return challenge();
  const [u, ...rest] = decode(h.slice(6)).split(":");
  const p = rest.join(":");
  if (u.length !== user.length || p.length !== pass.length) return challenge();
  let diff = 0;
  for (let i = 0; i < user.length; i++) diff |= u.charCodeAt(i) ^ user.charCodeAt(i);
  for (let i = 0; i < pass.length; i++) diff |= p.charCodeAt(i) ^ pass.charCodeAt(i);
  return diff === 0 ? NextResponse.next() : challenge();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
