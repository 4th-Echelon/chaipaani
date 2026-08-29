import { store } from "@/lib/data";
import { ok, publicReport } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET() {
  const [s, refusal] = await Promise.all([store.siteStats(), store.refusalStats()]);
  return ok({
    total_reports: s.totalReports,
    cities_covered: s.citiesCovered,
    refused_got_service_rate: s.refusedGotServiceRate,
    top_departments: s.topDepartments,
    latest: s.latest ? publicReport(s.latest) : null,
    featured_story: s.featured ? publicReport(s.featured) : null,
    state_refusal_stats: refusal.map((r) => ({ state: r.state, refused: r.refused, got_service: r.gotService, success_rate: r.successRate })),
  });
}
