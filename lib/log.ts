/**
 * Structured, PII-free logging. Every line is one JSON object on stdout or
 * stderr so Vercel's log drain (or any collector) can index it. Optionally
 * forwards errors to ERROR_WEBHOOK_URL. Never pass raw IPs, notes or file
 * contents into the fields.
 */
type Fields = Record<string, string | number | boolean | null | undefined>;

function line(level: "info" | "warn" | "error", event: string, fields: Fields = {}): string {
  return JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
}

export function logInfo(event: string, fields?: Fields): void {
  process.stdout.write(line("info", event, fields) + "\n");
}

export function logWarn(event: string, fields?: Fields): void {
  process.stderr.write(line("warn", event, fields) + "\n");
}

export function logError(event: string, err: unknown, fields: Fields = {}): void {
  const e = err as (Error & { digest?: string; cause?: { message?: string; code?: string } }) | undefined;
  const payload: Fields = {
    ...fields,
    message: e?.message ?? String(err),
    name: e?.name,
    digest: e?.digest,
    cause: e?.cause?.message,
    code: e?.cause?.code,
    stack: process.env.NODE_ENV === "production" ? undefined : e?.stack?.split("\n").slice(0, 6).join(" | "),
  };
  process.stderr.write(line("error", event, payload) + "\n");
  const url = process.env.ERROR_WEBHOOK_URL;
  if (url) {
    // Fire and forget; a failing monitor must never fail the request.
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: line("error", event, payload) }).catch(() => undefined);
  }
}
