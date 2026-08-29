import { NextRequest, NextResponse } from "next/server";
import { act, type ModAction } from "@/lib/admin/moderation";
import { fail, ok } from "../../../../_lib";
import { guard, readJson } from "../../../_guard";

export const dynamic = "force-dynamic";

/** POST /api/admin/reports/{id}/{publish|remove|hold}  body: { reason? } (JSON or form) */
export async function POST(req: NextRequest, { params }: { params: { id: string; action: string } }) {
  const g = guard(req);
  if ("res" in g) return g.res;
  const action = params.action as ModAction;
  if (!["publish", "remove", "hold"].includes(action)) return fail("Unknown action", 404);
  let reason: string | undefined;
  let redirect: string | undefined;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("form")) {
    const fd = await req.formData();
    reason = (fd.get("reason") as string) || undefined;
    redirect = (fd.get("redirect") as string) || undefined;
  } else {
    const body = await readJson<{ reason?: string }>(req);
    reason = body?.reason;
  }
  const res = await act(params.id, action, g.admin, reason);
  if (!res) return fail("Not found", 404);
  if (redirect) return NextResponse.redirect(new URL(redirect, req.url), 303);
  return ok(res);
}
