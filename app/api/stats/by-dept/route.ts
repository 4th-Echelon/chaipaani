import { store } from "@/lib/data";
import { ok } from "../../_lib";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await store.deptStats();
  return ok({
    cached_at: new Date().toISOString(),
    departments: d.map((x) => ({
      slug: x.slug,
      name: x.name,
      total_reports: x.count,
      avg_bribe: x.avgAmount,
      median_bribe: x.medianAmount,
      refusal_rate: x.refusalRate,
      refusal_success_rate: x.refusalSuccessRate,
    })),
  });
}
