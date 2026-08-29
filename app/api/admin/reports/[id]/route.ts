import { NextRequest } from "next/server";
import { edit } from "@/lib/admin/moderation";
import { fail, ok } from "../../../_lib";
import { guard, readJson } from "../../_guard";

export const dynamic = "force-dynamic";

/** PATCH: edit a report's fields. Every change is logged with before/after. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = guard(req);
  if ("res" in g) return g.res;
  const body = await readJson<Record<string, unknown> & { reason?: string }>(req);
  if (!body) return fail("Invalid JSON");
  const { reason, ...patch } = body;
  const mapped = {
    service: patch.service,
    officialRole: patch.official_role ?? patch.officialRole,
    amount: patch.amount,
    mode: patch.mode,
    cityText: patch.city ?? patch.cityText,
    incidentDate: patch.date ?? patch.incidentDate,
    note: patch.note,
    outcome: patch.outcome,
    lang: patch.lang,
  };
  const res = await edit(params.id, mapped as any, g.admin, typeof reason === "string" ? reason : undefined);
  if (!res) return fail("Not found", 404);
  return ok(res);
}
