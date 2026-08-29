import { NextResponse } from "next/server";
import type { Report } from "@/lib/types";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data, error: null }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}

/** Public shape (snake_case, matches the original registry's API). */
export function publicReport(r: Report) {
  return {
    id: r.id,
    public_id: r.publicId ?? null,
    tier: r.tier ?? "reported",
    cluster_size: r.clusterSize ?? null,
    report_type: r.reportType,
    department_slug: r.departmentSlug,
    department_name: r.department,
    service_name: r.service ?? null,
    official_role: r.officialRole ?? null,
    amount: r.amount,
    mode: r.mode ?? null,
    state: r.state,
    city: r.city,
    date: r.date,
    note: r.note ?? null,
    outcome: r.outcome,
    created_at: r.createdAt,
    helpful_count: r.helpfulCount,
    fake_count: r.fakeCount,
  };
}

export function toCsv(rows: ReturnType<typeof publicReport>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc((r as Record<string, unknown>)[k])).join(","))].join("\n");
}
