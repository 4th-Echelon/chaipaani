import { describe, expect, it } from "vitest";
import { scrub } from "./pii";

describe("pii scrubber", () => {
  it("redacts phone numbers, emails, UPI ids, Aadhaar, PAN, vehicle numbers and links", () => {
    const r = scrub(
      "Call 9876543210 or +91 98765 43210, mail x@example.com, pay ramesh@okaxis, aadhaar 1234 5678 9012, PAN ABCDE1234F, car KA 01 AB 1234, see https://x.y/z",
    );
    expect(r.text).not.toMatch(/9876543210|98765 43210/);
    expect(r.text).not.toMatch(/x@example\.com|ramesh@okaxis/);
    expect(r.text).not.toMatch(/1234 5678 9012/);
    expect(r.text).not.toMatch(/ABCDE1234F/);
    expect(r.text).not.toMatch(/KA 01 AB 1234/);
    expect(r.text).not.toMatch(/https:/);
    const kinds = r.redactions.map((x) => x.kind);
    expect(kinds).toEqual(expect.arrayContaining(["phone", "email", "upi_id", "aadhaar", "pan", "vehicle", "url"]));
  });

  it("flags honorific + name as a possible name without rejecting", () => {
    const r = scrub("Mr Sharma at the counter asked for chai paani.");
    expect(r.possibleName).toBe(true);
    expect(r.text).toContain("Sharma");
  });

  it("flags two consecutive capitalised unknown words", () => {
    expect(scrub("The clerk Ramesh Kumar demanded 500.").possibleName).toBe(true);
  });

  it("does not flag departments, cities, states or common words", () => {
    expect(scrub("Went to the Passport Office in Tamil Nadu. Traffic Police stopped me near Electricity Board.").possibleName).toBe(false);
    expect(scrub("Paid at RTO Bengaluru. Driving Licence issued next day.").possibleName).toBe(false);
  });

  it("handles empty input", () => {
    expect(scrub(undefined)).toEqual({ text: "", redactions: [], possibleName: false });
  });
});
