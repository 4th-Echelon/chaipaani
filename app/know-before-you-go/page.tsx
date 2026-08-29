import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/lib/data";
import { formatINR, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Know before you go" };
export const dynamic = "force-dynamic";

export default async function PrepPage() {
  const [depts, refusals, stats] = await Promise.all([store.deptStats(), store.refusalStats(), store.siteStats()]);
  return (
    <div className="container-x pt-12">
      <div className="label muted">Prep</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Know before you go.</h1>
      <p className="mt-2 max-w-xl text-ash">What people report paying, how often refusing works, and what you are entitled to. Read this before the visit, not after.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="label mb-4 text-ash">What to expect, by department</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="micro text-left"><th className="py-2 font-normal">Department</th><th className="py-2 text-right font-normal">Typical ask</th><th className="py-2 text-right font-normal">Refusal works</th></tr></thead>
              <tbody>
                {depts.filter((d) => d.count > 0).map((d) => (
                  <tr key={d.slug} className="border-t border-line-dark">
                    <td className="py-2"><Link href={`/dept/${d.slug}`} className="hover:underline">{d.name}</Link></td>
                    <td className="py-2 text-right font-mono text-white">{formatINR(d.medianAmount)}</td>
                    <td className="py-2 text-right font-mono text-ash">{d.refusalSuccessRate ? pct(d.refusalSuccessRate) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel p-5">
          <div className="label mb-4 text-ash">Refusal success by state</div>
          <ol className="divide-y divide-line-dark">
            {refusals.slice(0, 8).map((r) => (
              <li key={r.state} className="flex justify-between py-2 text-sm">
                <span>{r.state}</span>
                <span className="font-mono text-white">{pct(r.successRate)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-ash">Overall, {pct(stats.refusedGotServiceRate)} of people who refused still got the service.</p>
        </div>
      </div>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["rights", "Your rights", "Every department publishes a Citizen's Charter with service timelines. Ask for it. Under the Right to Public Services Acts in most states, delays beyond the timeline are appealable and officers can be fined."],
          ["refuse", "How to refuse", "Say you'll wait for the official process. Ask for objections in writing with a name and designation. Keep the acknowledgement slip. Most demands evaporate when a paper trail appears."],
          ["complain", "Where to complain", "State Anti-Corruption Bureau / Lokayukta, the Central Vigilance Commission (cvc.gov.in) for central departments, or the 1064 anti-corruption helpline where it operates. Demanding a bribe is an offence under the Prevention of Corruption Act."],
        ].map(([n, t, d]) => (
          <div key={n} className="panel p-5">
            <h2 className="text-lg font-semibold">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ash">{d}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-4 border border-line-dark p-6">
        <p className="text-ash">Went already? Whatever happened, it counts.</p>
        <Link href="/report" className="btn-primary">Report a bribe</Link>
      </div>
    </div>
  );
}
