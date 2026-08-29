/**
 * Cloudflare Turnstile verification. When TURNSTILE_SECRET is unset (local dev,
 * tests) verification is skipped and the report is stored with turnstile_ok=false.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, skipped: false, error: "Missing Turnstile token" };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetchImpl(ENDPOINT, { method: "POST", body });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    return data.success ? { ok: true, skipped: false } : { ok: false, skipped: false, error: (data["error-codes"] ?? []).join(",") || "Turnstile failed" };
  } catch (e) {
    return { ok: false, skipped: false, error: "Turnstile verification unavailable" };
  }
}
