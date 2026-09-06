"use client";

import { useState } from "react";
import type { Department } from "@/lib/types";

type FieldErrors = Record<string, string>;

interface Submitted {
  public_id: string;
  status: "published" | "held";
  tier: string;
  held_reason?: string;
  redactions: { kind: string; count: number }[];
  evidence_token?: string;
}

/** Inline UPI statement upload, authorised by the one-time evidence token. */
function EvidenceUploader({ publicId, token }: { publicId: string; token: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (new FormData(e.currentTarget).get("file") as File | null) ?? null;
    if (!file || file.size === 0) {
      setResult("Choose a CSV or PDF export first.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/reports/${publicId}/evidence`, { method: "POST", headers: { "x-evidence-token": token }, body: fd });
      const data = await res.json();
      if (!res.ok) setResult(data.error ?? "Upload failed.");
      else if (data.data?.matched) setResult(`Matched. A transaction for this amount and date was found (score ${data.data.score}). The report is now marked evidence backed.`);
      else setResult(`No matching transaction found (best score ${data.data?.best_score ?? 0}). Check the amount and date on the report, or try the CSV export instead of PDF.`);
    } catch {
      setResult("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={upload} className="mt-6 border-t border-line-dark pt-5">
      <p className="form-label">Attach a UPI statement (optional)</p>
      <p className="mt-1 max-w-[60ch] text-xs text-ash-dark">
        Export your transactions from PhonePe, Google Pay, Paytm or your bank as CSV or PDF. It is read in memory and never stored; only a hash of the matching transaction is kept.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input type="file" name="file" accept=".csv,.pdf,text/csv,application/pdf" className="text-sm text-ash-light" />
        <button type="submit" disabled={busy} className="btn-ghost disabled:opacity-60">
          {busy ? "Checking..." : "Upload and match"}
        </button>
      </div>
      {result && (
        <p role="status" className="mt-3 max-w-[60ch] text-sm text-ash-light">
          {result}
        </p>
      )}
    </form>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4">
      <p className="label text-ash">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="select-all break-all border border-line-dark bg-black px-3 py-2 font-mono text-[13px] text-white">{value}</code>
        <button
          type="button"
          className="btn-ghost h-9 px-3 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked; the text is still selectable */
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

const FIELD_MAP: Record<string, string> = {
  department_slug: "department",
  official_role: "official_role",
  turnstile_token: "form",
};

export default function ReportForm({ departments, states }: { departments: Department[]; states: string[] }) {
  const [reportType, setReportType] = useState<"paid" | "refused">("paid");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Submitted | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const body = {
      report_type: reportType,
      department_slug: fd.get("department"),
      service: fd.get("service") || undefined,
      official_role: fd.get("official_role") || undefined,
      amount: reportType === "paid" ? Number(fd.get("amount")) : undefined,
      mode: reportType === "paid" ? fd.get("mode") : undefined,
      state: fd.get("state"),
      city: fd.get("city"),
      date: fd.get("date"),
      note: fd.get("note"),
      outcome: fd.get("outcome"),
      consent: fd.get("consent") === "on",
      // Cloudflare Turnstile widget writes its token into this hidden field when configured.
      turnstile_token: (fd.get("cf-turnstile-response") as string) || undefined,
    };
    setBusy(true);
    try {
      const res = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.errors)) {
          const fe: FieldErrors = {};
          for (const er of data.errors) fe[FIELD_MAP[er.field] ?? er.field] = er.message;
          setFieldErrors(fe);
        }
        setError(res.status === 429 ? data.error : data.error ?? "Could not submit report.");
        return;
      }
      const r = data.data as Submitted;
      // Always show the confirmation screen: the evidence token is displayed exactly once.
      setDone(r);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => (fieldErrors[k] ? <p className="mt-1 text-xs text-white" role="alert">{fieldErrors[k]}</p> : null);
  const cls = (k: string) => `field ${fieldErrors[k] ? "border-white" : ""}`;

  if (done) {
    return (
      <div className="border border-line-dark p-6">
        <p className="label">Report received</p>
        <h2 className="mt-2 text-xl font-semibold">Reference {done.public_id}</h2>
        {done.held_reason === "possible_name" ? (
          <p className="mt-3 max-w-[60ch] text-sm text-ash-light">
            Your report is held for a human check before it goes public. Our filter thought the description might contain a person&apos;s name. Chai
            Paani never publishes names, so a moderator will confirm and publish it, usually within a day. Nothing about you was stored.
          </p>
        ) : done.status === "held" ? (
          <p className="mt-3 max-w-[60ch] text-sm text-ash-light">
            Every report is read by a moderator before it appears on the site. This keeps spam and fake entries out of the registry. Yours is in the
            queue and is usually published within a day. Keep the reference above if you want to look it up later. Nothing about you was stored.
          </p>
        ) : (
          <p className="mt-3 max-w-[60ch] text-sm text-ash-light">Your report is live. Nothing about you was stored.</p>
        )}
        {done.redactions.length > 0 && (
          <p className="mt-3 text-xs text-ash">Automatically removed before storing: {done.redactions.map((r) => `${r.kind} (${r.count})`).join(", ")}.</p>
        )}
        {done.evidence_token && (
          <>
            <CopyBlock label="Evidence token" value={done.evidence_token} />
            <p className="mt-2 max-w-[60ch] text-xs text-ash-light">
              Keep this token. It is the only way to attach a UPI statement to this report later, and we cannot recover it.
            </p>
            <EvidenceUploader publicId={done.public_id} token={done.evidence_token} />
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {done.status === "published" && (
            <a href={`/reports/${done.public_id}`} className="btn-primary inline-flex">View your report</a>
          )}
          <a href="/reports" className="btn-ghost inline-flex">Browse reports</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <fieldset>
        <legend className="form-label">What happened?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["paid", "refused"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setReportType(t)}
              aria-pressed={reportType === t}
              className={`border px-4 py-3 text-left text-sm ${reportType === t ? "border-white bg-white/10 text-white" : "border-line-dark text-ash hover:border-ash"}`}
            >
              {t === "paid" ? "I paid a bribe" : "I refused to pay"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="department" className="form-label">Department *</label>
          <select id="department" name="department" required className={cls("department")} defaultValue="">
            <option value="" disabled>Select department</option>
            {departments.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </select>
          {err("department")}
        </div>
        <div>
          <label htmlFor="service" className="form-label">Service you needed</label>
          <input id="service" name="service" className={cls("service")} placeholder="e.g. Driving licence renewal" maxLength={80} />
          {err("service")}
        </div>
        <div>
          <label htmlFor="official_role" className="form-label">Role of the official</label>
          <input id="official_role" name="official_role" className={cls("official_role")} placeholder="e.g. Clerk, Inspector, Agent" maxLength={60} />
          <p className="mt-1 text-xs text-ash-dark">Role only. Never a name.</p>
          {err("official_role")}
        </div>
        <div>
          <label htmlFor="date" className="form-label">Date *</label>
          <input id="date" name="date" type="date" required className={cls("date")} max={new Date().toISOString().slice(0, 10)} />
          {err("date")}
        </div>
        {reportType === "paid" && (
          <>
            <div>
              <label htmlFor="amount" className="form-label">Amount (INR) *</label>
              <input id="amount" name="amount" type="number" min={1} max={10000000} step={1} required className={`${cls("amount")} font-mono`} placeholder="500" />
              {err("amount")}
            </div>
            <div>
              <label htmlFor="mode" className="form-label">Paid via *</label>
              <select id="mode" name="mode" required className={cls("mode")} defaultValue="cash">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
              {err("mode")}
            </div>
          </>
        )}
        <div>
          <label htmlFor="state" className="form-label">State *</label>
          <select id="state" name="state" required className={cls("state")} defaultValue="">
            <option value="" disabled>Select state</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {err("state")}
        </div>
        <div>
          <label htmlFor="city" className="form-label">City / town *</label>
          <input id="city" name="city" required className={cls("city")} placeholder="e.g. Vellore" maxLength={60} />
          {err("city")}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="outcome" className="form-label">Outcome *</label>
          <select id="outcome" name="outcome" required className={cls("outcome")} defaultValue="done">
            <option value="done">{reportType === "paid" ? "Bribe paid and work was completed" : "Refused, and the work was still completed"}</option>
            <option value="partial">{reportType === "paid" ? "Bribe paid but work only partially completed" : "Refused, work partially completed"}</option>
            <option value="not_done">{reportType === "paid" ? "Bribe paid but work still not completed" : "Refused, and the work was not done"}</option>
          </select>
          {err("outcome")}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="note" className="form-label">What happened *</label>
          <textarea id="note" name="note" rows={4} minLength={20} maxLength={2000} required className={cls("note")} placeholder="Describe what happened in at least 20 characters. Do not include names, phone numbers or anything that identifies you or others." />
          <p className="mt-1 text-xs text-ash-dark">Phone numbers, emails, UPI IDs, ID numbers and vehicle numbers are removed automatically. Descriptions that look like they name a person are held for review.</p>
          {err("note")}
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-ash">
        <input type="checkbox" name="consent" required className="mt-1 accent-white" />
        <span>
          This report is truthful to the best of my knowledge, names no private individual, and I agree to the{" "}
          <a href="/terms" className="text-white underline">terms</a>.
        </span>
      </label>
      {err("consent")}

      <div id="turnstile-slot" className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />

      <p className="text-xs text-ash-dark">
        Paying a bribe can itself be an offence under the Prevention of Corruption Act unless reported promptly. We collect nothing that identifies you.
      </p>

      {error && (
        <p role="alert" className="border border-line-dark bg-black-2 px-4 py-3 font-mono text-[12px] text-white">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
          {busy ? "Submitting..." : "Submit anonymously"}
        </button>
        <span className="font-mono text-[11px] text-ash-dark">No account. No name. No trace.</span>
      </div>
    </form>
  );
}
