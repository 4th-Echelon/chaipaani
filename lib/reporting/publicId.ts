import { randomBytes } from "crypto";

/** Crockford base32 (no I, L, O, U) so IDs read unambiguously aloud. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generatePublicId(len = 4): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % 32];
  return `CP-${out}`;
}

export const PUBLIC_ID_RE = /^CP-[0-9A-HJKMNP-TV-Z]{4,8}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Retry generation until `exists` says the id is free. */
export async function uniquePublicId(exists: (id: string) => Promise<boolean>, maxTries = 10): Promise<string> {
  let len = 4;
  for (let i = 0; i < maxTries; i++) {
    const id = generatePublicId(len);
    if (!(await exists(id))) return id;
    if (i >= 4) len = 5; // ~1M ids; widen if the 4-char space is getting crowded
  }
  throw new Error("Could not allocate a public id");
}
