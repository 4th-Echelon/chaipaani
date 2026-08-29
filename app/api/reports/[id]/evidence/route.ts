import { NextRequest, NextResponse } from "next/server";
import { attachEvidence, MAX_BYTES } from "@/lib/evidence/attach";
import { requestHash } from "@/lib/reporting/anon";
import { consume } from "@/lib/reporting/ratelimit";
import { logError } from "@/lib/log";
import { fail, ok } from "../../../_lib";

export const maxDuration = 30;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * multipart/form-data with a single `file` field (CSV or PDF, <= 5 MB).
 * The file is parsed in memory and never written to disk or logged.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Reject before reading the body: unknown or oversized lengths are not parsed at all.
  const lenHeader = req.headers.get("content-length");
  const len = Number(lenHeader);
  if (!lenHeader || !Number.isFinite(len) || len <= 0) return fail("Content-Length required", 411);
  if (len > MAX_BYTES + 4096) return fail("File is larger than 5 MB", 413);

  const hash = await requestHash(req);
  const limit = await consume("evidence", hash);
  if (!limit.ok) {
    return NextResponse.json({ data: null, error: "Too many uploads today. Try again tomorrow." }, { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } });
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Expected multipart/form-data with a file field"); }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Missing file");
  if (file.size > MAX_BYTES) return fail("File is larger than 5 MB", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const res = await attachEvidence(params.id, { bytes, mime: file.type || "", filename: file.name || "" });
    if (!res.ok) return NextResponse.json({ data: null, error: res.message }, { status: res.status });
    return ok(res, { status: res.matched ? 201 : 200 });
  } catch (err) {
    logError("evidence.attach", err, { report: params.id, bytes: bytes.byteLength });
    return fail("Could not read that file. Export a fresh CSV or PDF and try again.", 422);
  }
}
