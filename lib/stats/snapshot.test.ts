import { describe, expect, it } from "vitest";
import { getDb } from "../db/client";
import { reports } from "../db/schema";
import { departmentId, invalidateCache, store } from "../data";
import { readSnapshots, refreshSnapshots, SNAPSHOT_KEYS, snapshotAgeSeconds } from "./snapshot";

async function insert(n: number, ip = "hash-a") {
  const db = await getDb();
  const deptId = (await departmentId(db, "police"))!;
  for (let i = 0; i < n; i++) {
    await db.insert(reports).values({
      publicId: `CP-T${String(i).padStart(3, "0")}${ip.slice(-1)}`,
      reportType: "paid",
      departmentId: deptId,
      service: "FIR copy",
      amount: 500 + i,
      mode: "cash",
      cityText: "Delhi",
      stateCode: "DL",
      incidentDate: "2026-08-10",
      outcome: "completed",
      note: "a note about the incident",
      ipHash: ip,
      turnstileOk: false,
    });
  }
}

describe("stats snapshots", () => {
  it("refresh writes every key with timings", async () => {
    await insert(2);
    const summary = await refreshSnapshots();
    expect(summary.map((s) => s.key)).toEqual([...SNAPSHOT_KEYS]);
    expect(summary.every((s) => s.ok)).toBe(true);
    const rows = await readSnapshots(SNAPSHOT_KEYS);
    expect(rows).toHaveLength(SNAPSHOT_KEYS.length);
    const site = rows.find((r) => r.key === "site")!.value as { totalReports: number };
    expect(site.totalReports).toBe(2);
    expect(rows.every((r) => r.computedMs >= 0)).toBe(true);
  });

  it("store reads the snapshot, not the live tables", async () => {
    await insert(1);
    await refreshSnapshots();
    expect((await store.siteStats()).totalReports).toBe(1);
    // New data lands, in-process cache is cleared, but the snapshot is unchanged:
    // the store must still answer from the snapshot.
    await insert(3, "hash-b");
    invalidateCache();
    expect((await store.siteStats()).totalReports).toBe(1);
    expect((await store.stateStats()).find((s) => s.state === "Delhi")?.count).toBe(1);
    await refreshSnapshots();
    expect((await store.siteStats()).totalReports).toBe(4);
    expect((await store.cityStats(5))[0]?.count).toBe(4);
    expect((await store.trending(2))).toHaveLength(2);
  });

  it("a missing snapshot is computed once, stored, then served", async () => {
    await insert(2);
    expect(await readSnapshots(["states"])).toHaveLength(0);
    const first = await store.stateStats();
    expect(first[0]?.count).toBe(2);
    expect(await readSnapshots(["states"])).toHaveLength(1);
    await insert(1, "hash-c");
    invalidateCache();
    expect((await store.stateStats())[0]?.count).toBe(2);
  });

  it("snapshotAge reports seconds since the oldest snapshot", async () => {
    expect(await snapshotAgeSeconds()).toBeNull();
    expect(await store.snapshotAge()).toBeNull();
    await refreshSnapshots();
    const age = await store.snapshotAge();
    expect(age).not.toBeNull();
    expect(age!).toBeGreaterThanOrEqual(0);
    expect(age!).toBeLessThan(60);
  });
});
