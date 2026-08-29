import type { Metadata } from "next";
import { store } from "@/lib/data";

export const metadata: Metadata = { title: "Open data" };
export const dynamic = "force-dynamic";

export default async function DataPage() {
  const stats = await store.siteStats();
  return (
    <div className="container-x pt-12">
      <div className="label muted">Open data</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Data belongs to India.</h1>
      <p className="mt-2 max-w-xl text-ash">The full registry: {stats.totalReports.toLocaleString("en-IN")} reports: is downloadable, machine-readable and licensed for reuse.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["CSV", "/api/reports?format=csv&limit=100", "Flat file, one row per report."],
          ["JSON", "/api/reports?limit=100", "Paginated. Same shape as the public API."],
          ["Stats JSON", "/api/stats/by-state", "Aggregates by state, refreshed on request."],
        ].map(([k, href, d]) => (
          <a key={k} href={href} className="panel block p-5 hover:border-ash">
            <div className="font-mono text-2xl text-white">{k}</div>
            <p className="mt-2 text-sm text-ash">{d}</p>
            <span className="micro mt-4 block text-ink">Download</span>
          </a>
        ))}
      </div>

      <section className="mt-12 max-w-2xl">
        <h2 className="text-2xl font-semibold">Methodology</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div><dt className="micro">What a report is</dt><dd className="mt-1 text-ash">A single anonymous allegation with department, service, amount, location, date and outcome. It is not a legal finding.</dd></div>
          <div><dt className="micro">Verification</dt><dd className="mt-1 text-ash">Reports are clustered by department × city × 30-day window. A cluster of three or more independent reports is marked as a verified pattern. Individual reports are never marked verified.</dd></div>
          <div><dt className="micro">Averages</dt><dd className="mt-1 text-ash">Averages and medians exclude refused reports (amount = 0). Refusal success = share of refused reports whose service was still completed.</dd></div>
          <div><dt className="micro">Moderation</dt><dd className="mt-1 text-ash">Reports flagged by five or more readers are hidden from rankings pending review. Removed reports are excluded from all downloads.</dd></div>
          <div><dt className="micro">Caveat</dt><dd className="mt-1 text-ash">Report counts measure reporting activity, not corruption prevalence. Do not read the rankings as &ldquo;most corrupt&rdquo;.</dd></div>
          <div><dt className="micro">Licence</dt><dd className="mt-1 text-ash">Data: CC BY 4.0. Code: AGPL-3.0.</dd></div>
        </dl>
      </section>
    </div>
  );
}
