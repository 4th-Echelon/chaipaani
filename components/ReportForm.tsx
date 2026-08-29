"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Department } from "@/lib/types";

type FieldErrors = Record<string, string>;

interface Submitted {
  public_id: string;
  status: "published" | "held";
  tier: string;
  held_reason?: string;
  redactions: { kind: string; count: number }[];
}

const FIELD_MAP: Record<string, string> = {
  department_slug: "department",
  official_role: "official_role",
  turnstile_token: "form",
};

export default function ReportForm({ departments, states }: { departments: Department[]; states: string[] }) {
  const router = useRouter();
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
      if (r.status === "published") {
        router.push(`/reports/${r.public_id}?submitted=1`);
        return;
      }
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
        <p className="mt-3 max-w-[60ch] text-sm text-ash-light">
          Your report is held for a quick human check before it goes public. Our filter thought the description might contain a person&apos;s name. Chai
          Paani never publishes names, so a moderator will confirm and publish it, usually within a day. Nothing about you was stored.
        </p>
        {done.redactions.length > 0 && (
          <p className="mt-3 text-xs text-ash">Automatically removed before storing: {done.redactions.map((r) => `${r.kind} (${r.count})`).join(", ")}.</p>
        )}
        <a href="/reports" className="btn-ghost mt-6 inline-flex">Browse reports</a>
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
