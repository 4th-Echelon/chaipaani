import { store } from "@/lib/data";
import { ok } from "../../_lib";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await store.stateStats();
  return ok({
    cached_at: new Date().toISOString(),
    states: stats.map((s) => ({
      state: s.state,
      total_reports: s.count,
      avg_amount: s.avgAmount,
      refusal_rate: s.refusalRate,
      top_department: s.topDepartment ?? null,
    })),
  });
}
