import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/lib/data";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Cities" };
export const dynamic = "force-dynamic";

export default async function CitiesPage() {
  const cities = await store.cityStats(50);
  return (
    <div className="container-x pt-12">
      <div className="label muted">City leaderboard</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Cities.</h1>
      <p className="mt-2 max-w-xl text-ash">Ranked by total reported bribe volume. From metros to small towns.</p>
      <div className="panel mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="micro text-left">
              <th className="px-5 py-3 font-normal">#</th>
              <th className="px-3 py-3 font-normal">City</th>
              <th className="px-3 py-3 text-right font-normal">Reports</th>
              <th className="px-3 py-3 text-right font-normal">Volume</th>
              <th className="px-5 py-3 font-normal">Most reported</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c, i) => (
              <tr key={`${c.city}-${c.state}`} className="border-t border-line-dark hover:bg-black-2">
                <td className="px-5 py-3 font-mono text-[11px] text-ash-dark">{i + 1}.</td>
                <td className="px-3 py-3">
                  <Link href={`/reports?city=${encodeURIComponent(c.city)}&state=${encodeURIComponent(c.state)}`} className="hover:underline">
                    {c.city}, {c.state}
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-mono text-ash">{c.count}</td>
                <td className="px-3 py-3 text-right font-mono text-white">{formatINR(c.totalAmount)}</td>
                <td className="px-5 py-3 text-ash">{c.topDepartment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
