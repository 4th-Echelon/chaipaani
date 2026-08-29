import type { Metadata } from "next";
import Link from "next/link";
import ReportCard from "@/components/ReportCard";
import { DEPARTMENTS, STATES, store } from "@/lib/data";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ReportsPage({ searchParams }: { searchParams: SP }) {
  const page = Math.max(1, Number(s(searchParams.page)) || 1);
  const q = {
    state: s(searchParams.state) || undefined,
    dept: s(searchParams.dept) || undefined,
    city: s(searchParams.city) || undefined,
    q: s(searchParams.q) || undefined,
    minAmount: Number(s(searchParams.min)) || undefined,
    maxAmount: Number(s(searchParams.max)) || undefined,
    type: (s(searchParams.type) as "paid" | "refused") || undefined,
    page,
    limit: 20,
  };
  const { reports, total, limit } = await store.listReports(q);
  const pages = Math.max(1, Math.ceil(total / limit));
  const href = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => { if (k !== "page" && s(v)) u.set(k, s(v)); });
    u.set("page", String(p));
    return `/reports?${u.toString()}`;
  };

  return (
    <div className="container-x pt-12">
      <div className="label muted">Active registry</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Live reports.</h1>
      <p className="mt-2 text-ash">{total.toLocaleString("en-IN")} reports{q.state ? ` in ${q.state}` : ""}. Every report is anonymous and permanent.</p>

      <form method="get" className="panel mt-8 grid gap-3 p-4 md:grid-cols-6">
        <input name="q" defaultValue={q.q} placeholder="Search" className="field md:col-span-2" />
        <select name="state" defaultValue={q.state ?? ""} className="field">
          <option value="">All states</option>
          {STATES.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
        <select name="dept" defaultValue={q.dept ?? ""} className="field">
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
        </select>
        <select name="type" defaultValue={q.type ?? ""} className="field">
          <option value="">Paid + refused</option>
          <option value="paid">Paid only</option>
          <option value="refused">Refused only</option>
        </select>
        <div className="flex gap-2">
          <input name="min" type="number" defaultValue={q.minAmount} placeholder="Min ₹" className="field font-mono" />
          <input name="max" type="number" defaultValue={q.maxAmount} placeholder="Max ₹" className="field font-mono" />
        </div>
        <div className="flex items-center gap-3 md:col-span-6">
          <button type="submit" className="btn-primary">Filter</button>
          <Link href="/reports" className="font-mono text-[11px] uppercase tracking-wider text-ash hover:underline">Clear</Link>
        </div>
      </form>

      {reports.length === 0 ? (
        <div className="panel mt-8 p-8 text-center">
          <p className="text-ash">We don&rsquo;t have any bribe reports matching this filter combination yet. Be the first to add transparency!</p>
          <Link href="/report" className="btn-primary mt-6">Be the first to report</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {reports.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Reports pagination" className="mt-8 flex items-center justify-center gap-2 font-mono text-[12px]">
          {page > 1 && <Link href={href(page - 1)} className="btn-ghost">Prev</Link>}
          <span className="px-3 text-ash">{page} / {pages}</span>
          {page < pages && <Link href={href(page + 1)} className="btn-ghost">Next</Link>}
        </nav>
      )}
    </div>
  );
}
