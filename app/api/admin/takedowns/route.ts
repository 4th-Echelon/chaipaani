import { NextRequest } from "next/server";
import { listTakedowns } from "@/lib/admin/moderation";
import { ok } from "../../_lib";
import { guard } from "../_guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = guard(req);
  if ("res" in g) return g.res;
  const all = req.nextUrl.searchParams.get("all") === "1";
  return ok(await listTakedowns(undefined, !all));
}
