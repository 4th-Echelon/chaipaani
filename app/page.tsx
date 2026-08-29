import Link from "next/link";
import { store, DEPARTMENTS } from "@/lib/data";
import type { SiteStats } from "@/lib/types";
import { formatINR, longDate, pct, timeAgo } from "@/lib/format";
import ReportCard from "@/components/ReportCard";
import StateLedger from "@/components/StateLedger";
import DeptBars from "@/components/DeptBars";
import FAQ from "@/components/FAQ";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function HomePage() {
  // One slow or failing aggregate must not take the whole homepage down.
  const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
  const emptyStats: SiteStats = { totalReports: 0, citiesCovered: 0, refusedGotServiceRate: 0, topDepartments: [] };
  const [stats, states, feed, cities, refusals, trending] = await Promise.all([
    safe(store.siteStats(), emptyStats),
    safe(store.stateStats(), []),
    safe(store.listReports({ limit: 5 }), { reports: [], total: 0, page: 1, limit: 5 }),
    safe(store.cityStats(5), []),
    safe(store.refusalStats(), []),
    safe(store.trending(4), []),
  ]);
  const latest = stats.latest;
  const now = Date.now();
  const updatedAt = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const opts = DEPARTMENTS.filter((d) => d.slug !== "other");

  return (
    <>
      {/* HERO */}
      <section className="dark hero-surface border-b border-line-dark py-14 md:py-20">
        <div className="container-x grid items-end gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <div>
            <span className="label mb-6 inline-flex items-center gap-2 text-ash">
              <span className="inline-block h-1.5 w-1.5 animate-pulse bg-white" aria-hidden />
              Live: {stats.totalReports.toLocaleString("en-IN")} reports across India
            </span>
            <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.035em] md:text-[64px]">
              Name the role.
              <br />
              Name the amount.
              <br />
              Name the department.
            </h1>
            <p className="mt-5 max-w-[44ch] text-[17px] text-ash">
              India&rsquo;s crowdsourced bribe registry. Anonymous, corroborated by pattern, and permanently public.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/report" className="btn-primary">Report a bribe</Link>
              <Link href="#live-feed" className="btn-ghost">Browse reports</Link>
            </div>
          </div>

          {latest && (
            <Link href={`/reports/${latest.id}`} className="block border border-line-dark bg-black-3 p-6">
              <div className="flex items-baseline justify-between border-b border-line-dark pb-3">
                <span className="label text-ash">Latest report</span>
                <span className="font-mono text-[11px] text-ash">{longDate(latest.date)}</span>
              </div>
              <div className="mt-4 font-mono text-[44px] font-medium leading-none tracking-[-0.03em]">{formatINR(latest.amount)}</div>
              <div className="mt-2 text-sm">{latest.department}, {latest.city}</div>
              {latest.note && <p className="mt-4 text-[15px] leading-relaxed text-ash-light">&ldquo;{latest.note}&rdquo;</p>}
            </Link>
          )}
        </div>
      </section>

      {/* STATS + DEPARTMENTS + PREP (light) */}
      <section className="light py-16 md:py-[72px]" id="depts">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
            <div>
              <h2 className="text-[28px] font-semibold md:text-[34px]">What the registry holds today</h2>
              <div className="mt-6 grid grid-cols-3 border-t border-line-light">
                {[
                  [stats.totalReports.toLocaleString("en-IN"), "Reports filed", `across ${states.length} states`],
                  [String(stats.citiesCovered), "Cities covered", "metros to small towns"],
                  [pct(stats.refusedGotServiceRate), "Refused, still served", "of reporters who declined to pay"],
                ].map(([v, k, s], i) => (
                  <div key={k} className={`pt-5 pr-5 ${i > 0 ? "border-l border-line-light pl-5" : ""}`}>
                    <div className="font-mono text-[36px] font-medium leading-none tracking-[-0.03em]">{v}</div>
                    <div className="mt-2 text-[13px]">{k}</div>
                    <div className="mt-0.5 text-xs text-ash-dark">{s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Most reported departments</h3>
              <DeptBars items={stats.topDepartments} />
            </div>
          </div>
          <div id="prep" className="mt-14 flex flex-wrap items-center justify-between gap-6 border border-black px-7 py-6">
            <div>
              <h3 className="text-xl font-semibold">Heading to a government office?</h3>
              <p className="mt-1 text-ash-dark">Know your rights, the refusal success rate, and what to expect before you go.</p>
            </div>
            <Link href="/know-before-you-go" className="btn-primary">Know before you go</Link>
          </div>
        </div>
      </section>

      {/* LIVE FEED (dark) */}
      <section className="dark py-16 md:py-[72px]" id="live-feed">
        <div className="container-x">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-8">
            <h2 className="text-[28px] font-semibold md:text-[34px]">Live reports</h2>
            <p className="max-w-[62ch] text-[15px] text-ash">Filter by state, sort by amount, switch to table view. Every report is anonymous and permanent.</p>
          </div>
          <ul className="border-t border-line-dark">
            {feed.reports.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="flex justify-between gap-6 border-b border-line-dark py-4 text-[15px] hover:text-[#ffffff]">
                  <span>
                    Someone {r.reportType === "refused" ? "refused a bribe" : <>reported paying <span className="font-mono font-medium">{formatINR(r.amount)}</span></>} at {r.department}, {r.city}
                  </span>
                  <span className="whitespace-nowrap font-mono text-xs text-ash">{timeAgo(r.createdAt, now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* LEDGER (light) */}
      <section className="light py-16 md:py-[72px]">
        <div className="container-x">
          <StateLedger stats={states} updatedAt={updatedAt} />
        </div>
      </section>

      {/* REPORT CARDS (dark) */}
      <section className="dark py-16 md:py-[72px]">
        <div className="container-x">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-8">
            <h2 className="text-[28px] font-semibold md:text-[34px]">Recent report cards</h2>
            <Link href="/reports" className="btn-ghost">Browse reports</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {trending.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </div>
      </section>

      {/* CITY LEADERBOARD + REFUSAL (light) */}
      <section className="light py-16 md:py-[72px]" id="cities">
        <div className="container-x grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-[28px] font-semibold md:text-[34px]">City leaderboard</h2>
            <p className="mt-1.5 text-sm text-ash-dark">Ranked by total bribe volume reported.</p>
            <ol className="mt-4 border-t border-black">
              {cities.map((c, i) => (
                <li key={`${c.city}-${c.state}`} className="flex items-center justify-between gap-4 border-b border-line-light py-3.5">
                  <div>
                    <span className="mr-2.5 font-mono text-ash-dark">{i + 1}</span>
                    {c.city}, {c.state}
                    <div className="ml-[34px] mt-0.5 text-xs text-ash-dark">Most reported: {c.topDepartment}</div>
                  </div>
                  <span className="whitespace-nowrap font-mono font-medium">{formatINR(c.totalAmount)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-[28px] font-semibold md:text-[34px]">Refusal success rates</h2>
            <p className="mt-1.5 text-sm text-ash-dark">Share of reporters who refused to pay and still got the service.</p>
            <ol className="mt-4 border-t border-black">
              {refusals.slice(0, 5).map((r, i) => (
                <li key={r.state} className="flex items-center justify-between gap-4 border-b border-line-light py-3.5">
                  <div>
                    <span className="mr-2.5 font-mono text-ash-dark">{i + 1}</span>
                    {r.state}
                    <div className="ml-[34px] mt-0.5 text-xs text-ash-dark">Work done for {r.gotService} of {r.refused} who refused</div>
                  </div>
                  <span className="whitespace-nowrap font-mono font-medium">{pct(r.successRate)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* COMPARE (dark) */}
      <section className="dark py-16 md:py-[72px]" id="compare">
        <div className="container-x">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-8">
            <h2 className="text-[28px] font-semibold md:text-[34px]">Compare departments</h2>
            <p className="text-[15px] text-ash">Average bribe, refusal rate and volume, side by side.</p>
          </div>
          <form action="/compare" method="get" className="grid items-end gap-4 border border-line-dark p-6 md:grid-cols-[1fr_auto_1fr_auto]">
            <div>
              <label htmlFor="a" className="form-label">Department A</label>
              <select id="a" name="a" className="field" defaultValue="police">
                {opts.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
              </select>
            </div>
            <div className="hidden pb-3 font-mono text-ash md:block">vs</div>
            <div>
              <label htmlFor="b" className="form-label">Department B</label>
              <select id="b" name="b" className="field" defaultValue="rto">
                {opts.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary">Compare</button>
          </form>
        </div>
      </section>

      {/* HOW IT WORKS (light) */}
      <section className="light py-16 md:py-[72px]">
        <div className="container-x">
          <h2 className="text-[28px] font-semibold md:text-[34px]">How it works</h2>
          <p className="mb-8 mt-2 text-ash-dark">No account. No name. No trace. Just the facts: department, amount, what happened.</p>
          <div className="border-t border-black">
            {[
              ["Report anonymously", "File a report in 60 seconds", "No account needed. No name collected. Select the department, enter the amount, describe what happened."],
              ["Others corroborate", "Similar reports confirm the pattern", "When reports cluster around one office or service within the same month, the report is marked corroborated automatically."],
              ["Data goes public", "Every report enters the permanent index", "Searchable by state, department, amount and date. Mirrored nightly so it cannot disappear."],
            ].map(([k, t, d]) => (
              <div key={k} className="grid gap-2 border-b border-line-light py-7 md:grid-cols-[200px_1fr] md:gap-8">
                <div className="font-semibold">{k}</div>
                <div>
                  <h3 className="text-xl font-semibold">{t}</h3>
                  <p className="mt-1.5 text-ash-dark">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ (dark) */}
      <section className="dark py-16 md:py-[72px]">
        <div className="container-x">
          <h2 className="mb-6 text-[28px] font-semibold md:text-[34px]">Questions</h2>
          <FAQ />
        </div>
      </section>

      {/* CLOSING CTA + SUPPORT (light wash) */}
      <section className="cta py-16 md:py-[72px]" id="report">
        <div className="container-x grid items-start gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <div>
            <h2 className="text-[32px] font-semibold tracking-[-0.03em] md:text-[52px]">Every report chips away at impunity.</h2>
            <p className="mt-4 text-base text-ash-dark">Takes 60 seconds. Stays anonymous. Matters more than you think.</p>
            <Link href="/report" className="btn-primary mt-7">Report a bribe</Link>
          </div>
          <div className="border border-black p-6">
            <h3 className="text-xl font-semibold">Keep Chai Paani free and independent</h3>
            <p className="my-2 mb-5 text-sm text-ash-dark">No ads, no paywalls, no strings. Server and moderation costs come out of pocket. Chip in to keep the data public and growing.</p>
            <a href="https://rzp.io/rzp/support-bribesfyi" className="btn-ghost" rel="noopener noreferrer">Support the project</a>
          </div>
        </div>
      </section>
    </>
  );
}
