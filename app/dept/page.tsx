import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/lib/data";
import { formatINR, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

export default async function DeptIndex() {
  const depts = await store.deptStats();
  const max = Math.max(1, ...depts.map((d) => d.count));
  return (
    <div className="container-x pt-12">
      <div className="label muted">Rankings</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Departments.</h1>
      <p className="mt-2 max-w-xl text-ash">Report counts measure reporting activity, not corruption prevalence. Read the averages alongside the counts.</p>

      <div className="panel mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="micro text-left">
              <th className="px-5 py-3 font-normal">Department</th>
              <th className="px-3 py-3 text-right font-normal">Reports</th>
              <th className="px-3 py-3 text-right font-normal">Avg</th>
              <th className="px-3 py-3 text-right font-normal">Median</th>
              <th className="px-3 py-3 text-right font-normal">Refused</th>
              <th className="px-5 py-3 text-right font-normal">Refusal success</th>
            </tr>
          </thead>
          <tbody>
            {depts.map((d) => (
              <tr key={d.slug} className="border-t border-line-dark hover:bg-black-2">
                <td className="relative px-5 py-3">
                  <span aria-hidden className="absolute inset-y-2 left-0 bg-white/10" style={{ width: `${Math.round((d.count / max) * 100)}%` }} />
                  <Link href={`/dept/${d.slug}`} className="relative hover:underline">{d.name}</Link>
                </td>
                <td className="px-3 py-3 text-right font-mono text-white">{d.count}</td>
                <td className="px-3 py-3 text-right font-mono text-ash">{formatINR(d.avgAmount)}</td>
                <td className="px-3 py-3 text-right font-mono text-ash">{formatINR(d.medianAmount)}</td>
                <td className="px-3 py-3 text-right font-mono text-ash">{pct(d.refusalRate)}</td>
                <td className="px-5 py-3 text-right font-mono text-ash">{pct(d.refusalSuccessRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
