/**
 * End-to-end pipeline against in-memory PGlite:
 * submit -> listed -> vote -> 5 fake flags hold it -> admin publish restores it,
 * plus PII hold, rate limit, evidence attach, takedown, complaint and dump.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { act, fileTakedown, decideTakedown, queue } from "../lib/admin/moderation";
import { adminFromRequest } from "../lib/admin/auth";
import { generateComplaint } from "../lib/complaint/generate";
import { store } from "../lib/data";
import { getDb } from "../lib/db/client";
import { dumpRows, rowsToCsv } from "../lib/dump";
import { attachEvidence } from "../lib/evidence/attach";
import { ipHash } from "../lib/reporting/anon";
import { submitReport } from "../lib/reporting/submit";
import { castVote } from "../lib/reporting/vote";

const body = {
  report_type: "paid",
  department_slug: "rto",
  service: "Driving licence renewal",
  official_role: "Counter clerk",
  amount: 1000,
  mode: "upi",
  state: "Haryana",
  city: "Faridabad",
  date: "2026-08-16",
  outcome: "done",
  note: "Was told the file would sit for months unless something was arranged. Paid 1000 by UPI and the licence came the next day.",
  consent: true,
};

describe("reporting pipeline", () => {
  it("submit -> list -> vote -> auto-hold -> admin publish", async () => {
    const db = await getDb();
    const res = await submitReport(body, { ipHash: "reporter-1", db });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.report.status).toBe("published");
    expect(res.report.public_id).toMatch(/^CP-/);

    const list = await store.listReports({ state: "HR" });
    expect(list.total).toBe(1);
    expect(list.reports[0].publicId).toBe(res.report.public_id);
    expect(list.reports[0].amount).toBe(1000);

    const helpful = await castVote(res.report.public_id, "helpful", "voter-h", db);
    expect(helpful.ok).toBe(true);
    const dup = await castVote(res.report.public_id, "helpful", "voter-h", db);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.status).toBe(409);

    let last: Awaited<ReturnType<typeof castVote>> | undefined;
    for (let i = 0; i < 5; i++) last = await castVote(res.report.id, "fake", `voter-f${i}`, db);
    expect(last && last.ok && last.held).toBe(true);

    expect(await store.getReport(res.report.public_id)).toBeNull();
    expect((await store.getReport(res.report.public_id, { includeHeld: true }))?.status).toBe("held");
    expect((await store.listReports({})).total).toBe(0);

    const q = (await queue("held", db)).rows;
    expect(q).toHaveLength(1);
    expect(q[0].last_reason).toMatch(/fake_flags/);

    const pub = await act(res.report.public_id, "publish", "mod", "reviewed", db);
    expect(pub?.status).toBe("published");
    expect((await store.getReport(res.report.public_id))?.status).toBe("published");
    expect((await store.listReports({})).total).toBe(1);
  });

  it("holds reports that look like they name a person, and scrubs identifiers", async () => {
    const db = await getDb();
    const res = await submitReport({ ...body, note: "Inspector Rakesh Verma asked for money, call him on 9876543210 to confirm." }, { ipHash: "r2", db });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.report.status).toBe("held");
    expect(res.report.held_reason).toBe("possible_name");
    expect(res.report.redactions.map((r) => r.kind)).toContain("phone");
    const held = await store.getReport(res.report.public_id, { includeHeld: true });
    expect(held?.note).not.toContain("9876543210");
    expect((await store.listReports({})).total).toBe(0);
  });

  it("returns field errors and enforces the daily submission limit", async () => {
    const db = await getDb();
    const bad = await submitReport({ ...body, amount: undefined, consent: false }, { ipHash: "r3", db });
    expect(bad.ok).toBe(false);
    if (!bad.ok && bad.status === 400) expect(bad.errors.map((e) => e.field)).toEqual(expect.arrayContaining(["amount", "consent"]));
    for (let i = 0; i < 3; i++) expect((await submitReport(body, { ipHash: "r4", db })).ok).toBe(true);
    const limited = await submitReport(body, { ipHash: "r4", db });
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.status).toBe(429);
  });

  it("corroborates three independent reports on the same office", async () => {
    const db = await getDb();
    for (let i = 0; i < 3; i++) await submitReport(body, { ipHash: `ind-${i}`, db });
    const list = await store.listReports({ dept: "rto" });
    expect(list.reports.every((r) => r.tier === "corroborated")).toBe(true);
    expect((await store.getReport(list.reports[0].publicId!))?.clusterSize).toBe(3);
  });

  it("attaches UPI evidence in memory and stores only a hash", async () => {
    const db = await getDb();
    const res = await submitReport(body, { ipHash: "ev", db });
    if (!res.ok) throw new Error("submit failed");
    const bytes = new Uint8Array(readFileSync(path.join(__dirname, "fixtures", "generic.csv")));
    const a = await attachEvidence(res.report.public_id, { bytes, mime: "text/csv", filename: "s.csv" }, db, undefined, { token: res.report.evidence_token });
    expect(a.ok && a.matched).toBe(true);
    expect((await store.getReport(res.report.public_id))?.tier).toBe("evidence_backed");
    const rows = (await db.execute("select utr_hash, amount from evidence_matches" as any)) as any;
    const em = Array.isArray(rows) ? rows : rows.rows;
    expect(em).toHaveLength(1);
    expect(em[0].utr_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(em[0].amount).toBe(1000);
    // same UTR cannot back a second report
    const res2 = await submitReport(body, { ipHash: "ev2", db });
    if (!res2.ok) throw new Error("submit failed");
    const b = await attachEvidence(res2.report.public_id, { bytes, mime: "text/csv", filename: "s.csv" }, db, undefined, { token: res2.report.evidence_token });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.status).toBe(409);
  });

  it("takedown holds a report and a decision resolves it", async () => {
    const db = await getDb();
    const res = await submitReport(body, { ipHash: "td", db });
    if (!res.ok) throw new Error("submit failed");
    const t = await fileTakedown({ report: res.report.public_id, requester_kind: "department", reason: "Inaccurate office reference" }, db);
    expect(t?.status).toBe("held");
    expect(await store.getReport(res.report.public_id)).toBeNull();
    const d = await decideTakedown(t!.takedown_id, "rejected", "mod", "no basis", db);
    expect(d?.report?.status).toBe("published");
    expect((await store.getReport(res.report.public_id))?.status).toBe("published");
  });

  it("generates a complaint letter and an open-data dump without internals", async () => {
    const db = await getDb();
    const res = await submitReport(body, { ipHash: "c", db });
    if (!res.ok) throw new Error("submit failed");
    const r = (await store.getReport(res.report.public_id))!;
    const c = generateComplaint(r, r.stateCode!);
    expect(c.to.map((a) => a.name)).toContain("Central Vigilance Commission");
    expect(c.body).toContain(res.report.public_id);
    expect(c.body).not.toMatch(/—|–/);
    const rows = await dumpRows(db);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0])).not.toContain("ip_hash");
    expect(rowsToCsv(rows).split("\n")[0]).toBe("public_id,report_type,department,service,official_role,amount,mode,city,state,incident_date,outcome,tier,note,created_at");
  });

  it("hashes IPs with a daily key and validates admin basic auth in constant time", async () => {
    const db = await getDb();
    const d1 = new Date("2026-08-01T10:00:00Z");
    const d2 = new Date("2026-08-02T10:00:00Z");
    const a = await ipHash("1.2.3.4", db, d1);
    const b = await ipHash("1.2.3.4", db, d1);
    const c = await ipHash("1.2.3.4", db, d2);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain("1.2.3.4");
    const ok = new Request("http://x/api/admin/queue", { headers: { authorization: "Basic " + Buffer.from("mod:secret-pass").toString("base64") } });
    const bad = new Request("http://x/api/admin/queue", { headers: { authorization: "Basic " + Buffer.from("mod:wrong").toString("base64") } });
    expect(adminFromRequest(ok)).toBe("mod");
    expect(adminFromRequest(bad)).toBeNull();
  });
});
