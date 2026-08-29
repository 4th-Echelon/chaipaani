import { describe, expect, it } from "vitest";
import { toDbOutcome, fromDbOutcome, validateReportInput } from "./schema";

const base = {
  report_type: "paid",
  department_slug: "rto",
  amount: 500,
  mode: "cash",
  state: "Tamil Nadu",
  city: "Vellore",
  date: "2026-08-10",
  outcome: "done",
  note: "Asked for chai paani at the counter before the file would move.",
  consent: true,
};

describe("report input schema", () => {
  it("accepts a valid paid report and resolves state by name", () => {
    const r = validateReportInput(base);
    expect(r.ok).toBe(true);
  });
  it("accepts a state code", () => {
    expect(validateReportInput({ ...base, state: "TN" }).ok).toBe(true);
  });
  it("requires amount and mode when paid", () => {
    const r = validateReportInput({ ...base, amount: undefined, mode: undefined });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.field)).toEqual(expect.arrayContaining(["amount", "mode"]));
  });
  it("does not require amount when refused", () => {
    expect(validateReportInput({ ...base, report_type: "refused", amount: undefined, mode: undefined }).ok).toBe(true);
  });
  it("rejects future and very old dates with field errors", () => {
    const fut = validateReportInput({ ...base, date: "2099-01-01" });
    const old = validateReportInput({ ...base, date: "2015-01-01" });
    expect(fut.ok).toBe(false);
    expect(old.ok).toBe(false);
    if (!fut.ok) expect(fut.errors[0].field).toBe("date");
  });
  it("rejects short notes, missing consent and unknown departments", () => {
    const r = validateReportInput({ ...base, note: "short", consent: false, department_slug: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.field)).toEqual(expect.arrayContaining(["note", "consent", "department_slug"]));
  });
  it("maps outcomes both ways", () => {
    expect(toDbOutcome("paid", "done")).toBe("completed");
    expect(toDbOutcome("refused", "done")).toBe("refused_got_service");
    expect(toDbOutcome("refused", "not_done")).toBe("refused_denied");
    expect(fromDbOutcome("refused_got_service")).toBe("done");
    expect(fromDbOutcome("not_completed")).toBe("not_done");
  });
});
