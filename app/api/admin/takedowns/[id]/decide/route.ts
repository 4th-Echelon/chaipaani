import { NextRequest } from "next/server";
import { decideTakedown } from "@/lib/admin/moderation";
import { fail, ok } from "../../../../_lib";
import { guard, readJson } from "../../../_guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = guard(req);
  if ("res" in g) return g.res;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return fail("Invalid id");
  const body = await readJson<{ decision?: string; notes?: string }>(req);
  if (!body || (body.decision !== "upheld" && body.decision !== "rejected")) return fail("decision must be upheld or rejected");
  const res = await decideTakedown(id, body.decision, g.admin, body.notes);
  if (!res) return fail("Not found", 404);
  return ok(res);
}
