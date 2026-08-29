import { formatINR, longDate } from "../format";
import type { Report } from "../types";
import { authoritiesFor, type Authority } from "./authorities";

export interface Complaint {
  to: Authority[];
  subject: string;
  body: string;
}

const OUTCOME_TEXT: Record<string, string> = {
  done: "the service was provided after payment",
  partial: "the service was only partially provided after payment",
  not_done: "the service was still not provided after payment",
};
const REFUSED_TEXT: Record<string, string> = {
  done: "the service was eventually provided",
  partial: "the service was only partially provided",
  not_done: "the service was not provided",
};

/** Formal complaint text. Contains no reporter identity: the citizen fills that in when sending. */
export function generateComplaint(r: Report, stateCode: string): Complaint {
  const to = authoritiesFor(stateCode);
  const what = r.reportType === "paid" ? `a demand for and payment of an illegal gratification of ${formatINR(r.amount)}` : "a demand for an illegal gratification which I refused to pay";
  const subject = `Complaint under the Prevention of Corruption Act, 1988: ${r.department}, ${r.city}, ${r.state} (Chai Paani ref ${r.publicId ?? r.id})`;
  const lines = [
    `To,`,
    ...to.map((a) => `${a.name}, ${a.address}`),
    ``,
    `Subject: ${subject}`,
    ``,
    `Sir / Madam,`,
    ``,
    `I wish to report ${what} in connection with ${r.service ? `the service "${r.service}"` : "a public service"} at the ${r.department}${r.officialRole ? `, by an official acting as ${r.officialRole}` : ""} in ${r.city}, ${r.state}, on or around ${longDate(r.date)}.`,
    ``,
    r.reportType === "paid"
      ? `The payment was made ${r.mode === "upi" ? "through UPI" : r.mode === "cash" ? "in cash" : "by other means"} and ${OUTCOME_TEXT[r.outcome] ?? "the outcome is recorded in the attached report"}.`
      : `I refused the demand and ${REFUSED_TEXT[r.outcome] ?? "the outcome is recorded in the attached report"}.`,
    ``,
    r.note ? `Description of the incident: ${r.note}` : ``,
    ``,
    `This incident has been recorded on Chai Paani, a public registry of bribe reports, under reference ${r.publicId ?? r.id}. I request that the matter be investigated under Sections 7 and 13 of the Prevention of Corruption Act, 1988, and that I be informed of the action taken.`,
    ``,
    `I am willing to provide further particulars, including transaction evidence where available.`,
    ``,
    `Yours faithfully,`,
    ``,
    `[Your name]`,
    `[Your address]`,
    `[Your contact number]`,
    `Date: ${longDate(new Date().toISOString())}`,
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));
  return { to, subject, body: lines.join("\n") };
}
