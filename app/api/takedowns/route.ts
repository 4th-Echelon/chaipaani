import { NextRequest } from "next/server";
import { cleanText, fileTakedown } from "@/lib/admin/moderation";
import { requestHash } from "@/lib/reporting/anon";
import { consume } from "@/lib/reporting/ratelimit";
import { fail, ok } from "../_lib";

export const dynamic = "force-dynamic";

const KINDS = ["subject", "department", "legal", "reporter", "other"];

/** Public: anyone can ask for a report to be reviewed. The report is held immediately. */
export async function POST(req: NextRequest) {
  let body: { report?: string; public_id?: string; requester_kind?: string; contact?: string; reason?: string };
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const report = body.report ?? body.public_id;
  const kind = body.requester_kind ?? "other";
  if (!report) return fail("public_id is required");
  if (!KINDS.includes(kind)) return fail(`requester_kind must be one of ${KINDS.join(", ")}`);
  const reason = cleanText(body.reason, 2000);
  if (reason.length < 10) return fail("Give a reason of at least 10 characters");
  const rl = await consume("takedowns", await requestHash(req));
  if (!rl.ok) return fail("Too many takedown requests today", 429);
  const res = await fileTakedown({ report, requester_kind: kind, contact: cleanText(body.contact, 200) || undefined, reason });
  if (!res) return fail("Not found", 404);
  return ok(res, { status: res.merged ? 200 : 201 });
}
