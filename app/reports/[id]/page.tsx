import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { store } from "@/lib/data";
import { formatINR, longDate } from "@/lib/format";
import VoteButtons from "@/components/VoteButtons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const r = await store.getReport(params.id);
  if (!r) return { title: "Report not found" };
  return {
    title: `${r.reportType === "refused" ? "Refused bribe" : formatINR(r.amount)}, ${r.department}, ${r.city}`,
    description: r.note ?? `Anonymous bribe report: ${r.department}, ${r.city}, ${r.state}.`,
  };
}

const OUTCOME = { done: "Work completed", partial: "Partially completed", not_done: "Work not completed" } as const;

export default async function ReportPage({ params, searchParams }: { params: { id: string }; searchParams: { submitted?: string } }) {
  const r = await store.getReport(params.id);
  if (!r) notFound();
  const related = await store.listReports({ dept: r.departmentSlug, state: r.state, limit: 3 });
  const shortId = "BR-" + r.id.slice(0, 4).toUpperCase();

  return (
    <div className="container-x pt-12">
      {searchParams.submitted && (
        <div className="mb-6 border border-ash bg-white/10 px-4 py-3 font-mono text-[12px] text-white">
          Report published. It is now part of the permanent public index. Thank you for standing ground.
        </div>
      )}
      <div className="label muted">Bribe report {shortId}</div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <article className="panel p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{r.department}</h1>
              <div className="mt-1 text-ash">{r.city}, {r.state}</div>
            </div>
            <div className="text-right">
              {r.reportType === "refused" ? <span className="tag-strong">Refused to pay</span> : <div className="amount text-5xl">{formatINR(r.amount)}</div>}
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line-dark py-5 md:grid-cols-4">
            {[
              ["Date", longDate(r.date)],
              ["Service", r.service ?? "-"],
              ["Official role", r.officialRole ?? "-"],
              ["Payment", r.mode ? r.mode.toUpperCase() : "-"],
              ["Outcome", OUTCOME[r.outcome]],
              ["Type", r.reportType === "refused" ? "Refused" : "Paid"],
              ["Status", r.status === "published" ? "Published" : "Under review"],
              ["Filed", longDate(r.createdAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="micro">{k}</dt>
                <dd className="mt-1 text-sm">{v}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-8">
            <div className="micro">Report</div>
            <p className="mt-3 text-base leading-relaxed">{r.note ?? "No description provided."}</p>
          </section>

          <section className="mt-8 border-t border-line-dark pt-5">
            <div className="micro">Verification</div>
            <p className="mt-2 text-sm text-ash">
              Reports are verified by clustering: when independent reports converge on the same department, location and timeframe, the pattern is flagged. A single report is an allegation, not proof.
            </p>
          </section>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line-dark pt-5">
            <VoteButtons reportId={r.id} helpful={r.helpfulCount} fake={r.fakeCount} />
            <span className="font-mono text-[11px] text-ash-dark">Report ID: {r.id}</span>
          </footer>
        </article>

        <aside className="flex flex-col gap-4">
          <div className="panel p-5">
            <div className="label muted">Same department, same state</div>
            <ul className="mt-3 space-y-3">
              {related.reports.filter((x) => x.id !== r.id).map((x) => (
                <li key={x.id}>
                  <Link href={`/reports/${x.id}`} className="block text-sm hover:underline">
                    <span className="amount">{x.reportType === "refused" ? "Refused" : formatINR(x.amount)}</span>, {x.city}
                    <div className="font-mono text-[11px] text-ash">{longDate(x.date)}</div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/dept/${r.departmentSlug}`} className="btn-ghost mt-5">All {r.department} reports</Link>
          </div>
          <Link href="/report" className="btn-primary justify-center">Report a bribe</Link>
        </aside>
      </div>
    </div>
  );
}
