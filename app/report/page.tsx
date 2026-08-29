import type { Metadata } from "next";
import ReportForm from "@/components/ReportForm";
import { DEPARTMENTS, STATES } from "@/lib/data";

export const metadata: Metadata = { title: "Report a bribe" };

export default function ReportPage() {
  return (
    <div className="container-x grid gap-10 pt-12 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="label muted">Anonymous report</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Report a bribe.</h1>
        <p className="mt-3 max-w-xl text-ash">
          Takes 60 seconds. No account, no name, no trace. Department, amount, what happened: that&rsquo;s enough.
        </p>
        <div className="mt-8">
          <ReportForm departments={DEPARTMENTS} states={STATES} />
        </div>
      </div>
      <aside className="flex flex-col gap-4">
        <div className="panel p-5">
          <div className="label muted">Before you submit</div>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-ash">
            <li>Never name a private individual. Role only.</li>
            <li>Don&rsquo;t include phone numbers, UPI IDs or photos.</li>
            <li>Refused reports are as valuable as paid ones.</li>
            <li>Reports are permanent once published.</li>
          </ul>
        </div>
        <div className="panel p-5">
          <div className="micro">How anonymity works</div>
          <p className="mt-3 text-sm text-ash">
            Your IP is one-way hashed with a key that rotates daily and is used only to rate-limit spam. We store nothing that can identify you.
          </p>
        </div>
      </aside>
    </div>
  );
}
