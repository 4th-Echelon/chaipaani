/**
 * Pre-moderation: with REQUIRE_APPROVAL unset (the default), every submitted
 * report is held until a moderator publishes it from the admin panel.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { act, queue } from "../lib/admin/moderation";
import { store } from "../lib/data";
import { getDb } from "../lib/db/client";
import { submitReport } from "../lib/reporting/submit";

const body = {
  report_type: "paid",
  department_slug: "police",
  service: "Passport verification",
  official_role: "Constable at the station",
  amount: 500,
  mode: "cash",
  state: "Delhi",
  city: "Delhi",
  date: "2026-08-20",
  outcome: "done",
  note: "Verification visit was delayed twice until a payment was made at the station. After paying the report was filed the same day.",
  consent: true,
};

describe("pre-moderation (REQUIRE_APPROVAL default)", () => {
  const prev = process.env.REQUIRE_APPROVAL;
  beforeAll(() => {
    delete process.env.REQUIRE_APPROVAL;
  });
  afterAll(() => {
    if (prev === undefined) delete process.env.REQUIRE_APPROVAL;
    else process.env.REQUIRE_APPROVAL = prev;
  });

  it("holds every new report until an admin publishes it", async () => {
    const db = await getDb();
    const res = await submitReport(body, { ipHash: "approval-1", db });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.report.status).toBe("held");
    expect(res.report.held_reason).toBe("pending_review");

    // Invisible to the public until approved.
    expect(await store.getReport(res.report.public_id)).toBeNull();
    const list = await store.listReports({ state: "DL" });
    expect(list.reports.find((r) => r.publicId === res.report.public_id)).toBeUndefined();

    // Visible in the moderation queue with the pending reason.
    const held = await queue("held", db);
    const mine = held.find((r) => r.publicId === res.report.public_id);
    expect(mine).toBeDefined();
    expect(mine?.last_reason).toBe("pending_review");

    // Admin approves -> public.
    const pub = await act(res.report.public_id, "publish", "moderator", "looks genuine", db);
    expect(pub?.status).toBe("published");
    expect((await store.getReport(res.report.public_id))?.status).toBe("published");
  });

  it("auto-publishes only when REQUIRE_APPROVAL=0", async () => {
    process.env.REQUIRE_APPROVAL = "0";
    const db = await getDb();
    const res = await submitReport({ ...body, note: body.note + " Second filing from another network." }, { ipHash: "approval-2", db });
    delete process.env.REQUIRE_APPROVAL;
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.report.status).toBe("published");
  });
});
