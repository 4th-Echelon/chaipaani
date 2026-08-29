import { NextRequest } from "next/server";
import { generateComplaint } from "@/lib/complaint/generate";
import { store } from "@/lib/data";
import { fail, ok } from "../_lib";

export const dynamic = "force-dynamic";

/** POST { public_id } -> formal complaint letter and the authorities to send it to. */
export async function POST(req: NextRequest) {
  let body: { public_id?: string; report_id?: string };
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const ref = body.public_id ?? body.report_id;
  if (!ref) return fail("public_id is required");
  const r = await store.getReport(ref);
  if (!r) return fail("Not found", 404);
  return ok(generateComplaint(r, r.stateCode ?? ""));
}
