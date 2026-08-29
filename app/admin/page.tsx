import { listTakedowns, queue } from "@/lib/admin/moderation";
import { formatINR, longDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["held", "published", "removed"] as const;

export default async function AdminPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = (STATUSES as readonly string[]).includes(searchParams.status ?? "") ? (searchParams.status as (typeof STATUSES)[number]) : "held";
  const [rows, open] = await Promise.all([queue(status), listTakedowns(undefined, true)]);

  return (
    <main className="dark min-h-screen">
      <div className="wrap py-12">
        <h1 className="text-2xl font-semibold">Moderation</h1>
        <p className="muted mt-2 text-sm">Held reports wait here until a moderator publishes or removes them. Every action is logged.</p>

        <nav className="mt-8 flex gap-2" aria-label="Queue">
          {STATUSES.map((s) => (
            <a key={s} href={`/admin?status=${s}`} className={`btn-ghost ${s === status ? "bg-white text-black" : ""}`}>
              {s}
            </a>
          ))}
          <a href="/api/admin/log" className="btn-ghost ml-auto">Log (JSON)</a>
        </nav>

        {open.length > 0 && (
          <section className="mt-8 border border-line-dark p-4">
            <h2 className="label">Open takedown requests: {open.length}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {open.map((t) => (
                <li key={t.id} className="flex flex-wrap justify-between gap-3 border-t border-line-dark pt-2">
                  <span>
                    #{t.id} from {t.requesterKind}: {t.reason}
                  </span>
                  <span className="muted font-mono text-xs">POST /api/admin/takedowns/{t.id}/decide</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          {rows.length === 0 ? (
            <p className="muted border-t border-line-dark pt-6 text-sm">Nothing in the {status} queue.</p>
          ) : (
            <ul className="divide-y divide-line-dark border-t border-line-dark">
              {rows.map((r) => (
                <li key={r.id} className="grid gap-4 py-6 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="font-mono text-sm">{r.publicId}</span>
                      <span className="font-semibold">{r.department}</span>
                      <span className="muted text-sm">
                        {r.city}, {r.state}
                      </span>
                      <span className="font-mono">{r.reportType === "paid" ? formatINR(r.amount) : "refused"}</span>
                      <span className="muted text-xs">{longDate(r.date)}</span>
                    </div>
                    {r.service && <div className="mt-1 text-sm">Service: {r.service}</div>}
                    {r.officialRole && <div className="text-sm">Role: {r.officialRole}</div>}
                    <blockquote className="mt-3 max-w-[70ch] text-sm text-ash-light">{r.note}</blockquote>
                    <div className="muted mt-3 flex flex-wrap gap-4 font-mono text-[11px]">
                      <span>reason: {r.last_reason ?? "none"}</span>
                      <span>possible name: {r.scrub.possibleName ? "yes" : "no"}</span>
                      <span>cluster: {r.clusterSize ?? 0}</span>
                      <span>helpful {r.helpfulCount} / fake {r.fakeCount}</span>
                      <span>tier: {r.tier}</span>
                      <span>hash: {r.ip_hash_prefix}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {status !== "published" && (
                      <form method="post" action={`/api/admin/reports/${r.id}/publish`}>
                        <input type="hidden" name="redirect" value={`/admin?status=${status}`} />
                        <input type="hidden" name="reason" value="moderator_review" />
                        <button className="btn-primary w-full" type="submit">Publish</button>
                      </form>
                    )}
                    {status !== "removed" && (
                      <form method="post" action={`/api/admin/reports/${r.id}/remove`}>
                        <input type="hidden" name="redirect" value={`/admin?status=${status}`} />
                        <input type="hidden" name="reason" value="moderator_review" />
                        <button className="btn-ghost w-full" type="submit">Remove</button>
                      </form>
                    )}
                    {status === "published" && (
                      <form method="post" action={`/api/admin/reports/${r.id}/hold`}>
                        <input type="hidden" name="redirect" value={`/admin?status=${status}`} />
                        <input type="hidden" name="reason" value="moderator_review" />
                        <button className="btn-ghost w-full" type="submit">Hold</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
