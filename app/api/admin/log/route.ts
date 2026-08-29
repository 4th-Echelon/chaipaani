import { NextRequest } from "next/server";
import { log } from "@/lib/admin/moderation";
import { ok } from "../../_lib";
import { guard } from "../_guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = guard(req);
  if ("res" in g) return g.res;
  const limit = Math.min(1000, Number(req.nextUrl.searchParams.get("limit")) || 200);
  return ok(await log(limit));
}
