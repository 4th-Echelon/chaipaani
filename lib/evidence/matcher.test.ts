import { describe, expect, it } from "vitest";
import { bestMatch, MATCH_THRESHOLD, scoreTransaction } from "./matcher";

const target = { amount: 1000, incidentDate: "2026-08-16", words: ["RTO", "Driving licence", "clerk"] };

describe("matcher", () => {
  it("scores a perfect match at 100", () => {
    const s = scoreTransaction({ date: "2026-08-16", amount: 1000, counterparty: "RTO SERVICES PVT LTD", utr: "622698765432", direction: "debit" }, target);
    expect(s.parts).toEqual({ amount: 40, date: 30, counterparty: 20, utr: 10 });
    expect(s.score).toBe(100);
  });
  it("degrades by date distance and missing UTR", () => {
    expect(scoreTransaction({ date: "2026-08-17", amount: 1000, counterparty: "rto" }, target).score).toBe(80);
    expect(scoreTransaction({ date: "2026-08-19", amount: 1000, counterparty: "rto" }, target).score).toBe(70);
    expect(scoreTransaction({ date: "2026-08-30", amount: 1000, counterparty: "rto" }, target).score).toBe(60);
    expect(scoreTransaction({ date: "2026-08-30", amount: 1000, counterparty: "unknown shop" }, target).score).toBe(40);
  });
  it("halves credits and rejects wrong amounts", () => {
    expect(scoreTransaction({ date: "2026-08-16", amount: 1000, counterparty: "rto", utr: "622698765432", direction: "credit" }, target).score).toBe(50);
    expect(scoreTransaction({ date: "2026-08-16", amount: 900, counterparty: "rto", utr: "622698765432" }, target).parts.amount).toBe(0);
    expect(scoreTransaction({ date: "2026-08-16", amount: 1005, counterparty: "rto" }, target).parts.amount).toBe(36);
  });
  it("picks the best transaction and respects the threshold", () => {
    const b = bestMatch(
      [
        { date: "2026-08-14", amount: 120, counterparty: "Tea Stall" },
        { date: "2026-08-16", amount: 1000, counterparty: "RTO SERVICES", utr: "622698765432", direction: "debit" },
      ],
      target,
    )!;
    expect(b.transaction.utr).toBe("622698765432");
    expect(b.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    expect(bestMatch([], target)).toBeNull();
  });
});
