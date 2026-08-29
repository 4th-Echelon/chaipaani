import { NextRequest, NextResponse } from "next/server";
import { attachEvidence, MAX_BYTES } from "@/lib/evidence/attach";
import { fail, ok } from "../../../_lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * multipart/form-data with a single `file` field (CSV or PDF, <= 5 MB).
 * The file is parsed in memory and never written to disk or logged.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 4096) return fail("File is larger than 5 MB", 413);
  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Expected multipart/form-data with a file field"); }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Missing file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const res = await attachEvidence(params.id, { bytes, mime: file.type || "", filename: file.name || "" });
  if (!res.ok) return NextResponse.json({ data: null, error: res.message }, { status: res.status });
  return ok(res, { status: res.matched ? 201 : 200 });
}
