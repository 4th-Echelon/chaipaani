import { describe, expect, it } from "vitest";
import { getDb } from "../db/client";
import { consume, limitFor } from "./ratelimit";

describe("rate limiter", () => {
  it("allows up to the limit then blocks with a retry hint, per hash", async () => {
    const db = await getDb();
    const limit = limitFor("reports");
    expect(limit).toBe(3);
    for (let i = 0; i < limit; i++) expect((await consume("reports", "abc", db)).ok).toBe(true);
    const blocked = await consume("reports", "abc", db);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect((await consume("reports", "other", db)).ok).toBe(true);
    expect((await consume("votes", "abc", db)).ok).toBe(true);
  });

  it("resets after the window", async () => {
    const db = await getDb();
    const t0 = new Date("2026-08-01T00:00:00Z");
    for (let i = 0; i < 3; i++) await consume("reports", "x", db, t0);
    expect((await consume("reports", "x", db, t0)).ok).toBe(false);
    expect((await consume("reports", "x", db, new Date("2026-08-02T00:00:01Z"))).ok).toBe(true);
  });
});
