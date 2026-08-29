import { timingSafeEqual } from "crypto";

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // Compare against self to keep timing flat, then fail.
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** Returns the admin username when the request carries valid HTTP Basic credentials, else null. */
export function adminFromRequest(req: Request): string | null {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return null;
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Basic ")) return null;
  let decoded = "";
  try {
    decoded = Buffer.from(h.slice(6), "base64").toString("utf8");
  } catch {
    return null;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return null;
  const u = decoded.slice(0, i);
  const p = decoded.slice(i + 1);
  return safeEq(u, user) && safeEq(p, pass) ? u : null;
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ data: null, error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json", "www-authenticate": 'Basic realm="Chai Paani moderation", charset="UTF-8"' },
  });
}
