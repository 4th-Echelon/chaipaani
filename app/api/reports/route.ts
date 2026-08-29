import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/data";
import { getClientIp, requestHash } from "@/lib/reporting/anon";
import { submitReport } from "@/lib/reporting/submit";
import { fail, ok, publicReport, toCsv } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const num = (k: string) => { const n = Number(p.get(k)); return Number.isFinite(n) && n > 0 ? n : undefined; };
  const type = p.get("type");
  const result = await store.listReports({
    state: p.get("state") ?? undefined,
    dept: p.get("dept") ?? undefined,
    city: p.get("city") ?? undefined,
    q: p.get("q") ?? undefined,
    minAmount: num("min_amount"),
    maxAmount: num("max_amount"),
    type: type === "paid" || type === "refused" ? type : undefined,
    page: num("page"),
    limit: num("limit"),
  });
  const rows = result.reports.map(publicReport);
  if (p.get("format") === "csv") {
    return new Response(toCsv(rows), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=chaipaani-reports.csv" },
    });
  }
  return ok({ reports: rows, total: result.total, page: result.page, limit: result.limit });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const ip = getClientIp(req);
  const ipHash = await requestHash(req);
  const res = await submitReport(body, { ipHash, ip });
  if (res.ok) return ok(res.report, { status: 201 });
  if (res.status === 429) {
    return NextResponse.json({ data: null, error: res.message, retry_after: res.retryAfterSeconds }, { status: 429, headers: { "retry-after": String(res.retryAfterSeconds) } });
  }
  return NextResponse.json({ data: null, error: res.errors[0]?.message ?? "Invalid report", errors: res.errors }, { status: 400 });
}
