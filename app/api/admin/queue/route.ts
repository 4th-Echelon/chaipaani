import { NextRequest } from "next/server";
import { queue } from "@/lib/admin/moderation";
import { ok, publicReport } from "../../_lib";
import { guard } from "../_guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = guard(req);
  if ("res" in g) return g.res;
  const s = req.nextUrl.searchParams.get("status");
  const status = s === "published" || s === "removed" ? s : "held";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 25) || 25));
  const q = await queue(status, undefined, limit, page);
  const rows = q.rows;
  return ok({
    status,
    page: q.page,
    pages: q.pages,
    total: q.total,
    reports: rows.map((r) => ({ ...publicReport(r), status: r.status, tier: r.tier, cluster_size: r.clusterSize ?? 0, redactions: r.scrub.redactions, possible_name: r.scrub.possibleName, ip_hash_prefix: r.ip_hash_prefix, last_reason: r.last_reason })),
  });
}
