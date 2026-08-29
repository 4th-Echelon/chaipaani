import Link from "next/link";
import type { Report } from "@/lib/types";
import { formatINR, shortDate } from "@/lib/format";
import VoteButtons from "./VoteButtons";

const OUTCOME: Record<Report["outcome"], string> = {
  done: "Got work done",
  partial: "Partially done",
  not_done: "Work not done",
};

const MODE: Record<string, string> = { cash: "cash", upi: "UPI", other: "other" };

export default function ReportCard({ report, compact = false }: { report: Report; compact?: boolean }) {
  const refused = report.reportType === "refused";
  const refusedWon = refused && report.outcome === "done";
  return (
    <article className="panel flex flex-col gap-3.5 p-[22px]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/dept/${report.departmentSlug}`} className="text-[15px] font-semibold hover:underline">
            {report.department}
          </Link>
          <div className="mt-0.5 text-[13px] muted">
            {report.city}, {report.state}
            {report.service ? `. ${report.service}` : ""}
          </div>
        </div>
        {refused ? <span className="tag-strong">Refused</span> : <span className="whitespace-nowrap font-mono text-[22px] font-medium">{formatINR(report.amount)}</span>}
      </header>

      {report.note && !compact && (
        <blockquote className="text-[15px] leading-relaxed muted-2">&ldquo;{report.note}&rdquo;</blockquote>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3 hair">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs muted">
          <span>
            {shortDate(report.date)}
            {report.mode ? `, ${MODE[report.mode] ?? report.mode}` : ""}
          </span>
          <span className={refusedWon ? "tag-strong" : "tag"}>{refusedWon ? "Refused, got service" : OUTCOME[report.outcome]}</span>
        </div>
        <div className="flex items-center gap-3">
          <VoteButtons reportId={report.id} helpful={report.helpfulCount} fake={report.fakeCount} />
          <Link href={`/reports/${report.id}`} className="text-xs underline-offset-2 hover:underline muted">
            Full story
          </Link>
        </div>
      </footer>
    </article>
  );
}
