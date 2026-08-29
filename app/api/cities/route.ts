import { NextRequest } from "next/server";
import { store } from "@/lib/data";
import { ok } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(100, Number(req.nextUrl.searchParams.get("limit")) || 20);
  const c = await store.cityStats(limit);
  return ok(c.map((x) => ({ city: x.city, state: x.state, total_reports: x.count, total_amount: x.totalAmount, top_department: x.topDepartment ?? null })));
}
