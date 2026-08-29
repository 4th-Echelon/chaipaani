import { NextRequest, NextResponse } from "next/server";
import { requestHash } from "@/lib/reporting/anon";
import { castVote } from "@/lib/reporting/vote";
import { fail, ok } from "../_lib";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { report_id?: string; type?: string; kind?: string };
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const kind = body.kind ?? body.type;
  if (!body.report_id || (kind !== "helpful" && kind !== "fake")) return fail("report_id and kind (helpful|fake) required");
  const voterHash = await requestHash(req);
  const res = await castVote(body.report_id, kind, voterHash);
  if (!res.ok) {
    const headers: Record<string, string> = res.retryAfterSeconds ? { "retry-after": String(res.retryAfterSeconds) } : {};
    return NextResponse.json({ data: null, error: res.message }, { status: res.status, headers });
  }
  return ok(res);
}
