import { NextRequest } from "next/server";
import { store } from "@/lib/data";
import { fail, ok } from "../_lib";

export const dynamic = "force-dynamic";

/** "Know before you go" lookup: what to expect for a department in a city. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const dept = p.get("dept");
  const city = p.get("city") ?? undefined;
  if (!dept) return fail("dept is required");
  const [stat, local] = await Promise.all([store.deptStat(dept), store.listReports({ dept, city, limit: 100 })]);
  if (!stat) return fail("Unknown department", 404);
  const paid = local.reports.filter((r) => r.reportType === "paid").map((r) => r.amount).sort((a, b) => a - b);
  const refused = local.reports.filter((r) => r.reportType === "refused");
  return ok({
    department: stat.name,
    city: city ?? null,
    local_reports: local.total,
    local_median: paid.length ? paid[Math.floor(paid.length / 2)] : null,
    national_median: stat.medianAmount,
    refusal_success_rate: refused.length ? refused.filter((r) => r.outcome === "done").length / refused.length : stat.refusalSuccessRate,
    top_services: Object.entries(local.reports.reduce<Record<string, number>>((acc, r) => { if (r.service) acc[r.service] = (acc[r.service] ?? 0) + 1; return acc; }, {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([service, count]) => ({ service, count })),
  });
}
