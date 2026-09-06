/**
 * Cross-site request check for state-changing admin requests. Pure function so
 * it runs in the Edge middleware and in unit tests alike.
 *
 * Rules, in order:
 *  1. Safe methods (GET, HEAD, OPTIONS) always pass.
 *  2. If the browser sent Sec-Fetch-Site, it must be "same-origin" or "none"
 *     (typed URL, bookmark). "cross-site" and "same-site" are refused.
 *  3. Otherwise, if an Origin header is present its host must equal the
 *     request host.
 *  4. Requests with neither header (curl, scripts) pass; they still need the
 *     Basic credentials, which browsers never attach cross-origin on their own.
 */
export interface CsrfInput {
  method: string;
  host: string | null;
  secFetchSite: string | null;
  origin: string | null;
}

export type CsrfVerdict = { ok: true } | { ok: false; reason: string };

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return null;
  }
}

export function checkCsrf(input: CsrfInput): CsrfVerdict {
  if (SAFE.has(input.method.toUpperCase())) return { ok: true };
  const sfs = input.secFetchSite?.toLowerCase() ?? null;
  if (sfs) {
    if (sfs === "same-origin" || sfs === "none") return { ok: true };
    return { ok: false, reason: `sec-fetch-site ${sfs}` };
  }
  if (input.origin) {
    if (input.origin.toLowerCase() === "null") return { ok: false, reason: "opaque origin" };
    const oh = hostOf(input.origin);
    const h = input.host?.toLowerCase() ?? null;
    if (!oh || !h || oh !== h) return { ok: false, reason: "origin mismatch" };
  }
  return { ok: true };
}

/** Convenience for Request-like objects. */
export function checkCsrfRequest(req: { method: string; headers: { get(name: string): string | null } }): CsrfVerdict {
  return checkCsrf({
    method: req.method,
    host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
    secFetchSite: req.headers.get("sec-fetch-site"),
    origin: req.headers.get("origin"),
  });
}
