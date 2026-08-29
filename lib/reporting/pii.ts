/**
 * PII scrubber for free-text fields. Redacts identifiers in place and flags
 * probable person names. Flagged reports are HELD for review, never rejected.
 */
import { DEPARTMENT_SEED, STATE_SEED, CITY_SEED } from "../db/taxonomy";

export interface ScrubResult {
  text: string;
  redactions: { kind: string; count: number }[];
  possibleName: boolean;
}

const PATTERNS: { kind: string; re: RegExp; repl: string }[] = [
  { kind: "url", re: /\bhttps?:\/\/\S+|\bwww\.\S+/gi, repl: "[link removed]" },
  { kind: "email", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, repl: "[email removed]" },
  { kind: "upi_id", re: /\b[\w.-]{2,}@[a-z]{2,}\b/gi, repl: "[UPI ID removed]" },
  { kind: "aadhaar", re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, repl: "[ID number removed]" },
  { kind: "pan", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g, repl: "[PAN removed]" },
  { kind: "phone", re: /(?:\+?91[\s-]?|\b0)?\b[6-9](?:[\s-]?\d){9}\b/g, repl: "[phone removed]" },
  { kind: "vehicle", re: /\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}\b/g, repl: "[vehicle number removed]" },
];

const HONORIFIC = /\b(?:Mr|Mrs|Ms|Miss|Shri|Smt|Sri|Dr|Adv|Sh)\.?\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?/g;
const TWO_CAPS = /\b([A-Z][a-z]{2,})\s+(?=([A-Z][a-z]{2,})\b)/g; // lookahead so overlapping pairs are all tried

const WHITELIST = new Set<string>(
  [
    ...DEPARTMENT_SEED.flatMap((d) => d.name.split(/[\s/&]+/)),
    ...STATE_SEED.flatMap((s) => s.name.split(/[\s&]+/)),
    ...CITY_SEED.flatMap((c) => c.name.split(/\s+/)),
    "Police", "Station", "Office", "Officer", "Inspector", "Constable", "Clerk", "Agent", "Department", "Government",
    "Municipal", "Corporation", "Board", "Passport", "Seva", "Kendra", "Registration", "Licence", "License", "Driving",
    "Land", "Records", "Revenue", "Income", "Tax", "Traffic", "Head", "Sub", "Circle", "Tehsil", "Taluk", "District",
    "Collector", "Commissioner", "Secretary", "Ward", "Zone", "Block", "Panchayat", "Nagar", "Palika", "Sadar",
    "Head Office", "Regional", "Transport", "Electricity", "Water", "Supply", "New", "Old", "North", "South", "East", "West",
    "Central", "Main", "Road", "Street", "Cross", "Layout", "Phase", "Sector", "Colony", "Market", "Complex", "Bhavan",
    "The", "After", "Before", "They", "Then", "When", "Paid", "Refused", "Bribe", "Cash", "Rupees", "Also", "Said",
    "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Chai", "Paani", "Aadhaar", "Ration",
    "Voter", "Card", "Certificate", "Birth", "Death", "Marriage", "Caste", "Domicile", "Property", "Khata", "Mutation",
    "Fitness", "Permit", "Renewal", "Verification", "Tenant", "Building", "Plan", "Approval", "Trade", "Connection",
    "Meter", "Load", "Refund", "Assessment", "Inspection", "Rti", "Fir",
  ].map((w) => w.toLowerCase()),
);

export function scrub(input: string | undefined | null): ScrubResult {
  if (!input) return { text: "", redactions: [], possibleName: false };
  let text = input;
  const redactions: { kind: string; count: number }[] = [];
  for (const p of PATTERNS) {
    let count = 0;
    text = text.replace(p.re, () => {
      count++;
      return p.repl;
    });
    if (count) redactions.push({ kind: p.kind, count });
  }

  let possibleName = false;
  if (HONORIFIC.test(text)) possibleName = true;
  HONORIFIC.lastIndex = 0;
  if (!possibleName) {
    let m: RegExpExecArray | null;
    TWO_CAPS.lastIndex = 0;
    while ((m = TWO_CAPS.exec(text))) {
      const a = m[1].toLowerCase();
      const b = m[2].toLowerCase();
      // Sentence starts ("Paid Rs") and known vocabulary are not names.
      const atSentenceStart = m.index === 0 || /[.!?]\s+$/.test(text.slice(Math.max(0, m.index - 3), m.index));
      if (WHITELIST.has(a) || WHITELIST.has(b)) continue;
      if (atSentenceStart && WHITELIST.has(b)) continue;
      possibleName = true;
      break;
    }
  }
  return { text: text.trim(), redactions, possibleName };
}
