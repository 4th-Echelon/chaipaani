import { listTakedowns, queue, queueCounts } from "@/lib/admin/moderation";
import { formatINR, longDate, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STATUSES = ["held", "published", "removed"] as const;
type Status = (typeof STATUSES)[number];

const TAB_LABEL: Record<Status, string> = { held: "Awaiting review", published: "Published", removed: "Removed" };
const REASON_LABEL: Record<string, string> = {
  pending_review: "New report",
  possible_name: "Possible name in text",
  moderator_review: "Moderator decision",
};

function reasonLabel(reason: string | null): string {
  if (!reason) return "No reason recorded";
  if (reason.startsWith("takedown:")) return `Takedown request #${reason.slice(9)}`;
  if (reason.startsWith("fake_flags")) return "Flagged as fake by readers";
  return REASON_LABEL[reason] ?? reason.replace(/_/g, " ");
}

function Chip({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-[3px] font-mono text-[11px] tracking-[0.04em] ${
        strong ? "border-white bg-white text-black" : "border-line-dark text-ash-light"
      }`}
    >
      {children}
    </span>
  );
}

function Action({ id, action, label, back, primary = false }: { id: string; action: "publish" | "remove" | "hold"; label: string; back: string; primary?: boolean }) {
  return (
    <form method="post" action={`/api/admin/reports/${id}/${action}`}>
      <input type="hidden" name="redirect" value={back} />
      <input type="hidden" name="reason" value="moderator_review" />
      <button className={`${primary ? "btn-primary" : "btn-ghost"} w-full justify-center`} type="submit">
        {label}
      </button>
    </form>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: { status?: string } }) {
  const status: Status = (STATUSES as readonly string[]).includes(searchParams.status ?? "") ? (searchParams.status as Status) : "held";
  const [rows, open, counts] = await Promise.all([queue(status), listTakedowns(undefined, true), queueCounts()]);
  const back = `/admin?status=${status}`;
  const now = Date.now();

  return (
    <main className="dark min-h-screen">
      {/* Title bar */}
      <div className="border-b border-line-dark">
        <div className="container-x flex flex-wrap items-end justify-between gap-6 py-10">
          <div>
            <p className="label text-ash">Moderation</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review queue</h1>
            <p className="muted mt-2 max-w-[60ch] text-sm">
              Every report waits here until a moderator publishes or removes it. Names and contact details are already scrubbed. Every action is logged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/log" className="btn-ghost">Moderation log</a>
            <a href="/" className="btn-ghost">View site</a>
          </div>
        </div>
      </div>

      <div className="container-x py-10">
        {/* Tabs */}
        <nav className="flex flex-wrap gap-2 border-b border-line-dark pb-4" aria-label="Queue">
          {STATUSES.map((s) => (
            <a
              key={s}
              href={`/admin?status=${s}`}
              aria-current={s === status ? "page" : undefined}
              className={`inline-flex h-10 items-center gap-2 border px-4 text-sm ${
                s === status ? "border-white bg-white text-black" : "border-line-dark text-white hover:border-ash"
              }`}
            >
              {TAB_LABEL[s]}
              <span className={`font-mono text-[11px] ${s === status ? "text-black/60" : "text-ash"}`}>{counts[s]}</span>
            </a>
          ))}
        </nav>

        {/* Takedowns */}
        {open.length > 0 && (
          <section className="mt-8 border border-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Open takedown requests</h2>
              <span className="font-mono text-sm text-ash">{open.length}</span>
            </div>
            <ul className="mt-4 divide-y divide-line-dark">
              {open.map((t) => (
                <li key={t.id} className="grid gap-2 py-4 md:grid-cols-[auto_1fr_auto] md:items-baseline md:gap-6">
                  <span className="font-mono text-sm">#{t.id}</span>
                  <span className="text-sm">
                    <span className="text-ash">{t.requesterKind}:</span> {t.reason}
                  </span>
                  <span className="muted font-mono text-[11px]">POST /api/admin/takedowns/{t.id}/decide</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Queue */}
        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{TAB_LABEL[status]}</h2>
            <span className="muted text-sm">
              {rows.length} shown{rows.length < counts[status] ? ` of ${counts[status]}` : ""}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="border border-line-dark px-6 py-16 text-center">
              <p className="text-lg font-semibold">Nothing to review</p>
              <p className="muted mt-2 text-sm">New reports will appear here as they come in.</p>
            </div>
          ) : (
            <ul className="space-y-5">
              {rows.map((r) => (
                <li key={r.id} className="border border-line-dark bg-black-2">
                  <div className="grid gap-6 p-6 md:grid-cols-[1fr_180px] md:gap-8 md:p-7">
                    <div className="min-w-0">
                      {/* Top line */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="font-mono text-sm text-ash">{r.publicId}</span>
                        <span className="font-mono text-2xl font-medium tracking-tight">{r.reportType === "paid" ? formatINR(r.amount) : "Refused"}</span>
                        <Chip strong={(r.tier ?? "reported") !== "reported"}>{(r.tier ?? "reported").replace(/_/g, " ")}</Chip>
                      </div>

                      {/* Where and what */}
                      <div className="mt-3 text-[15px]">
                        <span className="font-semibold">{r.department}</span>
                        <span className="muted"> in </span>
                        <span>
                          {r.city}, {r.state}
                        </span>
                        <span className="muted"> on </span>
                        <span>{longDate(r.date)}</span>
                      </div>
                      {(r.service || r.officialRole) && (
                        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                          {r.service && (
                            <div>
                              <dt className="muted">Service</dt>
                              <dd>{r.service}</dd>
                            </div>
                          )}
                          {r.officialRole && (
                            <div>
                              <dt className="muted">Role named</dt>
                              <dd>{r.officialRole}</dd>
                            </div>
                          )}
                        </dl>
                      )}

                      {/* Note */}
                      <blockquote className="mt-5 border-l-2 border-line-dark pl-4 text-[15px] leading-relaxed text-ash-light">{r.note || <span className="muted">No description provided.</span>}</blockquote>

                      {/* Signals */}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Chip>{reasonLabel(r.last_reason)}</Chip>
                        {r.scrub.possibleName && <Chip strong>possible name</Chip>}
                        <Chip>cluster {r.clusterSize ?? 0}</Chip>
                        <Chip>
                          helpful {r.helpfulCount} / fake {r.fakeCount}
                        </Chip>
                        <Chip>net {r.ip_hash_prefix}</Chip>
                        <Chip>filed {timeAgo(r.createdAt, now)}</Chip>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 md:border-l md:border-line-dark md:pl-8">
                      {status !== "published" && <Action id={r.id} action="publish" label="Publish" back={back} primary />}
                      {status === "published" && <Action id={r.id} action="hold" label="Hold" back={back} />}
                      {status !== "removed" && <Action id={r.id} action="remove" label="Remove" back={back} />}
                    </div>
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
