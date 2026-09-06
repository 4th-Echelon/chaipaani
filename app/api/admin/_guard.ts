import { adminFromRequest, unauthorized } from "@/lib/admin/auth";

/** Returns the admin name or a 401 Response. */
export function guard(req: Request): { admin: string } | { res: Response } {
  const admin = adminFromRequest(req);
  return admin ? { admin } : { res: unauthorized() };
}

/**
 * Only a relative, same-origin path may be used as a post-action redirect.
 * Anything else (absolute URLs, protocol-relative "//host", backslash tricks,
 * schemes) falls back to the admin home.
 */
export function safeRedirectPath(input: unknown, fallback = "/admin"): string {
  if (typeof input !== "string") return fallback;
  const s = input.trim();
  if (!s || s.length > 512) return fallback;
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//") || s.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(s)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(s)) return fallback;
  return s;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
