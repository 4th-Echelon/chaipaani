/** Deterministic seed reports approximating the original registry's ledger (Aug 2026). */
import type { Report } from "../types";

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const LEDGER: { state: string; count: number; avg: number; refusal: number; cities: string[] }[] = [
  { state: "Karnataka", count: 38, avg: 9159, refusal: 0.11, cities: ["Bengaluru", "Mysuru", "Hubballi"] },
  { state: "Maharashtra", count: 26, avg: 11533, refusal: 0.19, cities: ["Mumbai", "Pune", "Nagpur"] },
  { state: "Uttar Pradesh", count: 19, avg: 34655, refusal: 0.11, cities: ["Lucknow", "Hapur", "Noida"] },
  { state: "Telangana", count: 15, avg: 10633, refusal: 0.2, cities: ["Hyderabad", "Warangal"] },
  { state: "Delhi", count: 14, avg: 3108, refusal: 0.14, cities: ["Delhi"] },
  { state: "Tamil Nadu", count: 12, avg: 7291, refusal: 0.08, cities: ["Chennai", "Coimbatore", "Vellore"] },
  { state: "Andhra Pradesh", count: 7, avg: 11400, refusal: 0.29, cities: ["Vijayawada", "Visakhapatnam"] },
  { state: "Gujarat", count: 7, avg: 46333, refusal: 0.14, cities: ["Ahmedabad", "Vadodara", "Surat"] },
  { state: "Haryana", count: 7, avg: 998, refusal: 0, cities: ["Gurgaon", "Faridabad"] },
  { state: "Rajasthan", count: 6, avg: 94700, refusal: 0, cities: ["Jaipur", "Jodhpur"] },
  { state: "West Bengal", count: 6, avg: 1517, refusal: 0, cities: ["Kolkata", "Howrah"] },
  { state: "Bihar", count: 3, avg: 2200, refusal: 0, cities: ["Patna"] },
  { state: "Goa", count: 2, avg: 0, refusal: 1, cities: ["Panaji"] },
  { state: "Jammu & Kashmir", count: 2, avg: 36500, refusal: 0, cities: ["Ramban", "Srinagar"] },
  { state: "Jharkhand", count: 2, avg: 800, refusal: 0, cities: ["Ranchi"] },
  { state: "Madhya Pradesh", count: 2, avg: 10250, refusal: 0, cities: ["Bhopal", "Indore"] },
  { state: "Assam", count: 1, avg: 0, refusal: 1, cities: ["Guwahati"] },
  { state: "Himachal Pradesh", count: 1, avg: 700, refusal: 0, cities: ["Shimla"] },
  { state: "Kerala", count: 1, avg: 1500, refusal: 0, cities: ["Kochi"] },
];

const DEPT_WEIGHTS: [string, number][] = [
  ["police", 86], ["rto", 30], ["revenue-land-records", 28], ["passport-office", 10],
  ["municipal-corporation", 8], ["electricity-board", 4], ["income-tax", 2],
  ["food-drug-administration", 2], ["gst-office", 1],
];
const SERVICES: Record<string, string[]> = {
  police: ["FIR registration", "Passport verification", "Traffic stop", "NOC", "Tenant verification"],
  rto: ["Driving licence", "Vehicle registration", "Fitness certificate", "Permit renewal"],
  "revenue-land-records": ["Mutation", "Khata transfer", "Encumbrance certificate", "Survey"],
  "passport-office": ["Fresh passport", "Renewal", "Police verification"],
  "municipal-corporation": ["Building plan approval", "Trade licence", "Water connection"],
  "electricity-board": ["New connection", "Meter change", "Load enhancement"],
  "income-tax": ["Refund release", "Assessment"],
  "food-drug-administration": ["FSSAI licence", "Inspection"],
  "gst-office": ["Registration", "Refund"],
  other: ["General"],
};
const NOTES_PAID = [
  "Told the file would 'sit' unless something was arranged. Paid and it moved the same day.",
  "Agent said this is the standard rate for everyone. No receipt, obviously.",
  "Asked for 'chai-paani' at the counter. Paid to avoid a third visit.",
  "Officer kept finding new objections until money changed hands.",
  "Was told verification would take months otherwise. Paid to get it over with.",
  "Paid via UPI to a personal number. Work completed next morning.",
];
const NOTES_REFUSED = [
  "Refused and asked for it in writing. They backed off and processed it.",
  "Said no, quoted the citizen charter timeline. Got the document a week later.",
  "Refused to pay. Was made to wait but the work still got done.",
  "Declined. They stalled and I am still waiting for the document.",
];

function pickDept(r: number): string {
  const total = DEPT_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let x = r * total;
  for (const [slug, w] of DEPT_WEIGHTS) {
    x -= w;
    if (x <= 0) return slug;
  }
  return "police";
}

function uuidFrom(rand: () => number): string {
  const h = () => Math.floor(rand() * 16).toString(16);
  const seg = (k: number) => Array.from({ length: k }, h).join("");
  return `${seg(8)}-${seg(4)}-4${seg(3)}-a${seg(3)}-${seg(12)}`;
}

const BASE_NOW = Date.UTC(2026, 7, 16, 12, 45);

export type SeedReport = Omit<Report, "department" | "publicId" | "tier"> & { ipHash: string };

export function buildSeed(): SeedReport[] {
  const rand = prng(20260816);
  const out: SeedReport[] = [];
  for (const s of LEDGER) {
    const refusals = Math.round(s.count * s.refusal);
    for (let k = 0; k < s.count; k++) {
      const refused = k < refusals;
      const dept = pickDept(rand());
      const services = SERVICES[dept] ?? SERVICES.other;
      const mult = 0.35 + rand() * 1.6;
      const amount = refused ? 0 : Math.max(100, Math.round((s.avg * mult) / 100) * 100);
      const daysAgo = Math.floor(rand() * 120);
      const createdAt = new Date(BASE_NOW - daysAgo * 86400000 - Math.floor(rand() * 3600000)).toISOString();
      const roll = rand();
      const outcome = refused ? (roll < 0.32 ? "done" : "not_done") : roll < 0.78 ? "done" : roll < 0.9 ? "partial" : "not_done";
      out.push({
        id: uuidFrom(rand),
        reportType: refused ? "refused" : "paid",
        departmentSlug: dept,
        service: services[Math.floor(rand() * services.length)],
        officialRole: undefined,
        amount,
        mode: refused ? undefined : rand() < 0.7 ? "cash" : "upi",
        state: s.state,
        city: s.cities[Math.floor(rand() * s.cities.length)],
        date: createdAt.slice(0, 10),
        note: refused ? NOTES_REFUSED[Math.floor(rand() * NOTES_REFUSED.length)] : NOTES_PAID[Math.floor(rand() * NOTES_PAID.length)],
        outcome,
        createdAt,
        helpfulCount: Math.floor(rand() * 6),
        fakeCount: rand() < 0.1 ? 1 : 0,
        status: "published",
        ipHash: `seed-${Math.floor(rand() * 1e9).toString(16)}`,
      });
    }
  }

  const featured: Partial<SeedReport>[] = [
    { id: "7f4773f8-2a93-473c-9a94-28d95156eb33", departmentSlug: "revenue-land-records", amount: 8000, city: "Bengaluru", state: "Karnataka", mode: "cash", outcome: "done", service: "Khata transfer",
      note: "Most corrupt people in BBMP after charging hefty on taxes they still do not proceed without bribe for any paper work" },
    { id: "1b9f33c8-3531-43f1-ad4d-1072ccc31d35", departmentSlug: "rto", amount: 1000, city: "Faridabad", state: "Haryana", mode: "cash", outcome: "done", service: "Driving licence",
      note: "Forced to pay a bribe of 1,000 rupees to an official at the RTO in Faridabad, Haryana. After paying, the work was completed successfully." },
    { id: "0bf4fe82-52da-4092-9424-4224bd2efa99", departmentSlug: "police", amount: 1000, city: "Delhi", state: "Delhi", mode: "cash", outcome: "done", service: "Passport verification",
      note: "Said there could be issues in getting passport verification cleared unless we 'cooperated'." },
    { id: "e7659cab-c691-456b-995b-38037dddab28", departmentSlug: "electricity-board", amount: 500, city: "Chennai", state: "Tamil Nadu", mode: "upi", outcome: "done", service: "New connection",
      note: "Forced to pay a bribe of 500 rupees to an official at the Electricity Board in Chennai, Tamil Nadu. After paying, the work was completed successfully." },
    { id: "f5ad84c3-9f65-49c1-8c2d-48d4b652bbed", departmentSlug: "police", amount: 500, city: "Gurgaon", state: "Haryana", mode: "cash", outcome: "done", service: "Traffic stop",
      note: "Stopped for a so-called document check. 500 rupees and no challan was issued." },
    { id: "58937c89-373e-44f7-b47c-88bd6934f0b5", departmentSlug: "rto", amount: 0, city: "Lucknow", state: "Uttar Pradesh", outcome: "done", service: "Vehicle registration", reportType: "refused",
      note: "Refused to pay. Quoted the RTO citizen charter and asked for the objection in writing. Registration came through in nine days." },
  ];
  featured.forEach((f, idx) => {
    const createdAt = new Date(BASE_NOW - 6 * 3600000 - idx * 600000).toISOString();
    out.push({
      id: f.id!, reportType: f.reportType ?? "paid", departmentSlug: f.departmentSlug!, service: f.service, officialRole: undefined,
      amount: f.amount ?? 0, mode: f.mode, state: f.state!, city: f.city!, date: "2026-08-16", note: f.note, outcome: f.outcome ?? "done",
      createdAt, helpfulCount: 0, fakeCount: 0, status: "published", ipHash: `seed-featured-${idx}`,
    });
  });
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}
