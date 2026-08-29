"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StateStat } from "@/lib/types";
import { formatINR, pct } from "@/lib/format";

type Sort = "reports" | "amount" | "refusals";

export default function StateLedger({ stats, updatedAt }: { stats: StateStat[]; updatedAt: string }) {
  const [sort, setSort] = useState<Sort>("reports");
  const rows = useMemo(() => {
    const s = [...stats];
    if (sort === "amount") s.sort((a, b) => b.avgAmount - a.avgAmount || a.state.localeCompare(b.state));
    else if (sort === "refusals") s.sort((a, b) => b.refusalRate - a.refusalRate || a.state.localeCompare(b.state));
    else s.sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
    return s;
  }, [stats, sort]);
  const max = Math.max(1, ...rows.map((r) => (sort === "amount" ? r.avgAmount : sort === "refusals" ? r.refusalRate : r.count)));

  const btn = (k: Sort, label: string) => (
    <button
      type="button"
      onClick={() => setSort(k)}
      aria-pressed={sort === k}
      className={`h-9 border px-3.5 text-[13px] font-medium ${sort === k ? "border-black bg-black text-white" : "border-ash-light text-black hover:border-black"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="label text-ash-dark">State registry ledger</span>
          <h2 className="mt-2 text-[28px] font-semibold md:text-[34px]">Explore state-level corruption</h2>
          <p className="mt-2 text-ash-dark">Click a row to filter the live reports.</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Sort ledger">
          {btn("reports", "Most reports")}
          {btn("amount", "Highest bribes")}
          {btn("refusals", "Most refusals")}
        </div>
      </div>
      <div className="overflow-x-auto border-t border-black">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left">
              {["", "State", "Reports", "Avg bribe", "Refused"].map((h, i) => (
                <th key={h || "idx"} className={`border-b border-line-light py-3 pr-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ash-dark ${i > 1 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const v = sort === "amount" ? r.avgAmount : sort === "refusals" ? r.refusalRate : r.count;
              const w = Math.round((v / max) * 100);
              return (
                <tr key={r.state} className="hover:bg-black/[.04]">
                  <td className="w-11 border-b border-line-light py-3 pr-3 font-mono text-ash-dark">{i + 1}</td>
                  <td className="border-b border-line-light py-3 pr-3">
                    <Link href={`/reports?state=${encodeURIComponent(r.state)}`} className="hover:underline">{r.state}</Link>
                    <span aria-hidden className="mt-1.5 block h-1.5 max-w-[260px] bg-black" style={{ width: `${w}%` }} />
                  </td>
                  <td className="border-b border-line-light py-3 pr-3 text-right font-mono tabular-nums">{r.count}</td>
                  <td className="border-b border-line-light py-3 pr-3 text-right font-mono tabular-nums">{formatINR(r.avgAmount)}</td>
                  <td className="border-b border-line-light py-3 pr-3 text-right font-mono tabular-nums">{pct(r.refusalRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ash-dark">Updated {updatedAt}. Report counts measure reporting activity, not corruption prevalence.</p>
    </div>
  );
}
