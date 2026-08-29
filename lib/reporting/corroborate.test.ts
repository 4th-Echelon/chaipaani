import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { reports } from "../db/schema";
import { departmentId } from "../data";
import { corroborate, normaliseService, recomputeAll } from "./corroborate";

async function insert(overrides: Partial<typeof reports.$inferInsert> & { ipHash: string; publicId: string }) {
  const db = await getDb();
  const deptId = (await departmentId(db, "rto"))!;
  const [r] = await db
    .insert(reports)
    .values({
      reportType: "paid",
      departmentId: deptId,
      service: "Driving licence renewal",
      amount: 500,
      mode: "cash",
      cityText: "Vellore",
      stateCode: "TN",
      incidentDate: "2026-08-10",
      outcome: "completed",
      note: "note",
      ...overrides,
    })
    .returning({ id: reports.id });
  return r.id;
}

describe("corroboration", () => {
  it("normalises services to the first three words", () => {
    expect(normaliseService("Driving Licence - Renewal (fast)")).toBe("driving licence renewal");
  });

  it("promotes a cluster only at 3 reports from 3 distinct hashes", async () => {
    const db = await getDb();
    const a = await insert({ ipHash: "h1", publicId: "CP-AAAA" });
    await corroborate(a, db);
    const b = await insert({ ipHash: "h2", publicId: "CP-AAAB", incidentDate: "2026-08-20" });
    const rb = await corroborate(b, db);
    expect(rb.size).toBe(2);
    expect(rb.corroborated).toBe(false);
    // same hash as b: does not count as independent
    const c = await insert({ ipHash: "h2", publicId: "CP-AAAC", incidentDate: "2026-08-25" });
    const rc = await corroborate(c, db);
    expect(rc.size).toBe(3);
    expect(rc.corroborated).toBe(false);
    const d = await insert({ ipHash: "h3", publicId: "CP-AAAD", service: "DRIVING LICENCE renewal (fast track)" });
    const rd = await corroborate(d, db);
    expect(rd.corroborated).toBe(true);
    const tiers = (await db.select({ tier: reports.tier, clusterId: reports.clusterId }).from(reports)).map((x) => x.tier);
    expect(tiers.every((t) => t === "corroborated")).toBe(true);
    expect(new Set((await db.select({ c: reports.clusterId }).from(reports)).map((x) => x.c)).size).toBe(1);
  });

  it("does not cluster across cities or outside the 30-day window", async () => {
    const db = await getDb();
    const a = await insert({ ipHash: "h1", publicId: "CP-BAAA" });
    await corroborate(a, db);
    const b = await insert({ ipHash: "h2", publicId: "CP-BAAB", cityText: "Chennai" });
    expect((await corroborate(b, db)).size).toBe(1);
    const c = await insert({ ipHash: "h3", publicId: "CP-BAAC", incidentDate: "2026-05-01" });
    expect((await corroborate(c, db)).size).toBe(1);
  });

  it("recomputeAll rebuilds clusters", async () => {
    const db = await getDb();
    for (let i = 0; i < 3; i++) await insert({ ipHash: `h${i}`, publicId: `CP-C00${i}` });
    const r = await recomputeAll(db);
    expect(r.reports).toBe(3);
    expect(r.clusters).toBe(1);
    const t = await db.select({ tier: reports.tier }).from(reports).where(eq(reports.stateCode, "TN"));
    expect(t.every((x) => x.tier === "corroborated")).toBe(true);
  });
});
