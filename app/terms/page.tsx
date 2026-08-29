import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

const SECTIONS: [string, string][] = [
  ["What this is", "Chai Paani (chaipaani.in) is a public, anonymous registry of self-reported bribe demands in India. Reports are allegations by anonymous members of the public. They are not verified facts, legal findings, or accusations by the operators of this site."],
  ["Anonymity", "We do not collect names, emails, phone numbers, accounts or device fingerprints. Your IP address is one-way hashed with a secret that rotates daily and is used only to rate-limit abuse. Raw IPs are never written to disk or logs."],
  ["What you may not post", "Names or identifying details of any individual (officials included: use their role), phone numbers, UPI IDs, vehicle numbers, photographs, or anything you know to be false. Reports containing these are removed."],
  ["Permanence", "Published reports are permanent and included in public datasets. Because we hold no identity, we cannot verify a request to delete a report from its author. Reports are removed only through moderation."],
  ["Moderation", "Any reader may flag a report. Flagged reports are hidden from rankings pending review. Moderators may remove reports that break these terms or are shown to be false. Moderation actions are logged and published in aggregate."],
  ["Disputes", "A department or office that believes a report about it is false may write to the address in the repository's SECURITY.md. We will review the cluster the report belongs to and respond in writing."],
  ["Data licence", "Data is published under CC BY 4.0. The source code is AGPL-3.0."],
  ["No warranty", "The service is provided as-is, without warranty. Nothing here is legal advice. If you are considering a complaint to an anti-corruption authority, consult a lawyer."],
];

export default function TermsPage() {
  return (
    <div className="container-x max-w-3xl pt-12">
      <div className="label muted">Terms &amp; privacy</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Terms.</h1>
      <p className="mt-2 text-ash">Short, because there is very little we know about you.</p>
      <ol className="mt-8 space-y-8">
        {SECTIONS.map(([t, body], i) => (
          <li key={t}>
            <h2 className="text-lg font-semibold">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ash">{body}</p>
          </li>
        ))}
      </ol>
      <p className="label mt-12 text-ash">Last updated 28 Aug 2026</p>
    </div>
  );
}
