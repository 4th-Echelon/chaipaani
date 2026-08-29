/** Open-data export: every published report, public fields only. */
import { asc, eq } from "drizzle-orm";
import { getDb, type Db } from "./db/client";
import { reports } from "./db/schema";
import { loadDepartments, rowToReport } from "./data";

export interface DumpRow {
  public_id: string;
  report_type: string;
  department: string;
  service: string | null;
  official_role: string | null;
  amount: number | null;
  mode: string | null;
  city: string;
  state: string;
  incident_date: string;
  outcome: string;
  tier: string;
  note: string | null;
  created_at: string;
}

export async function dumpRows(db?: Db): Promise<DumpRow[]> {
  const d = db ?? (await getDb());
  await loadDepartments(d);
  const rows = await d.select().from(reports).where(eq(reports.status, "published")).orderBy(asc(reports.createdAt));
  return rows.map((r) => {
    const p = rowToReport(r);
    return {
      public_id: p.publicId!,
      report_type: p.reportType,
      department: p.department,
      service: p.service ?? null,
      official_role: p.officialRole ?? null,
      amount: r.amount,
      mode: p.mode ?? null,
      city: p.city,
      state: p.state,
      incident_date: p.date,
      outcome: r.outcome,
      tier: p.tier!,
      note: p.note ?? null,
      created_at: p.createdAt,
    };
  });
}

export function rowsToCsv(rows: DumpRow[]): string {
  const keys: (keyof DumpRow)[] = ["public_id", "report_type", "department", "service", "official_role", "amount", "mode", "city", "state", "incident_date", "outcome", "tier", "note", "created_at"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n") + "\n";
}
