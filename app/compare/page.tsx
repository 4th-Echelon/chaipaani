import type { Metadata } from "next";
import { DEPARTMENTS, store } from "@/lib/data";
import { formatINR, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Compare departments" };
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function ComparePage({ searchParams }: { searchParams: { a?: string; b?: string } }) {
  const a = searchParams.a ?? "police";
  const b = searchParams.b ?? "rto";
  const [sa, sb] = await Promise.all([store.deptStat(a), store.deptStat(b)]);
  const rows: [string, string, string, boolean][] = sa && sb ? [
    ["Reports", String(sa.count), String(sb.count), sa.count >= sb.count],
    ["Average bribe", formatINR(sa.avgAmount), formatINR(sb.avgAmount), sa.avgAmount >= sb.avgAmount],
    ["Median bribe", formatINR(sa.medianAmount), formatINR(sb.medianAmount), sa.medianAmount >= sb.medianAmount],
    ["Refusal rate", pct(sa.refusalRate), pct(sb.refusalRate), sa.refusalRate >= sb.refusalRate],
    ["Refusal success", pct(sa.refusalSuccessRate), pct(sb.refusalSuccessRate), sa.refusalSuccessRate >= sb.refusalSuccessRate],
  ] : [];

  const opts = DEPARTMENTS.filter((d) => d.slug !== "other");
  return (
    <div className="container-x pt-12">
      <div className="label muted">Head to head</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Compare Departments.</h1>

      <form method="get" className="panel mt-8 grid items-end gap-3 p-4 md:grid-cols-[1fr_auto_1fr_auto]">
        <div>
          <label htmlFor="a" className="form-label">Department A</label>
          <select id="a" name="a" defaultValue={a} className="field">{opts.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select>
        </div>
        <div className="pb-2 text-center font-mono text-white">VS</div>
        <div>
          <label htmlFor="b" className="form-label">Department B</label>
          <select id="b" name="b" defaultValue={b} className="field">{opts.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select>
        </div>
        <button type="submit" className="btn-primary">Compare</button>
      </form>

      {sa && sb && (
        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="micro text-left">
                <th className="px-5 py-3 font-normal">Metric</th>
                <th className="px-3 py-3 text-right font-normal text-ink">{sa.name}</th>
                <th className="px-5 py-3 text-right font-normal text-ink">{sb.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, va, vb, aWins]) => (
                <tr key={k} className="border-t border-line-dark">
                  <td className="px-5 py-3 text-ash">{k}</td>
                  <td className={`px-3 py-3 text-right font-mono ${aWins ? "text-white" : "text-ash"}`}>{va}</td>
                  <td className={`px-5 py-3 text-right font-mono ${!aWins ? "text-white" : "text-ash"}`}>{vb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 font-mono text-[11px] text-ash-dark">The brighter value is the higher one. Higher is not better.</p>
    </div>
  );
}
