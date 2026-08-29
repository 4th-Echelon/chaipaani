import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { departmentBySlug, store } from "@/lib/data";
import { formatINR, pct } from "@/lib/format";
import ReportCard from "@/components/ReportCard";
import StatTile from "@/components/StatTile";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = departmentBySlug(params.slug);
  return { title: d ? `${d.name} bribes` : "Department" };
}

export default async function DeptPage({ params }: { params: { slug: string } }) {
  const dept = departmentBySlug(params.slug);
  if (!dept) notFound();
  const [stat, list, states] = await Promise.all([
    store.deptStat(dept.slug),
    store.listReports({ dept: dept.slug, limit: 12 }),
    store.stateStats(),
  ]);
  const byState = new Map<string, number>();
  const all = await store.listReports({ dept: dept.slug, limit: 100 });
  all.reports.forEach((r) => byState.set(r.state, (byState.get(r.state) ?? 0) + 1));
  const top = [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="container-x pt-12">
      <Link href="/dept" className="micro hover:underline">Departments</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{dept.name}</h1>
      <p className="mt-2 text-ash">{list.total.toLocaleString("en-IN")} reports on record.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatTile value={String(stat?.count ?? 0)} label="Reports" />
        <StatTile value={formatINR(stat?.avgAmount ?? 0)} label="Average bribe" />
        <StatTile value={formatINR(stat?.medianAmount ?? 0)} label="Median bribe" />
        <StatTile value={pct(stat?.refusalSuccessRate ?? 0)} label="Refusal success" sub="refused and still got the service" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="panel p-5">
          <div className="label mb-4 text-ash">Most reported in</div>
          <ol className="divide-y divide-line-dark">
            {top.map(([state, n]) => (
              <li key={state} className="flex justify-between py-2 text-sm">
                <Link href={`/reports?dept=${dept.slug}&state=${encodeURIComponent(state)}`} className="hover:underline">{state}</Link>
                <span className="font-mono text-white">{n}</span>
              </li>
            ))}
          </ol>
          <div className="label mt-6 text-ash-dark">{states.length} states in registry</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {list.reports.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      </div>
      <Link href={`/reports?dept=${dept.slug}`} className="btn-ghost mt-8">All {dept.name} reports</Link>
    </div>
  );
}
