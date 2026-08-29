import { describe, expect, it } from "vitest";
import { generatePublicId, PUBLIC_ID_RE, uniquePublicId } from "./publicId";

describe("public ids", () => {
  it("generates CP-XXXX in Crockford base32", () => {
    for (let i = 0; i < 200; i++) expect(generatePublicId()).toMatch(PUBLIC_ID_RE);
    expect(generatePublicId()).not.toMatch(/[ILOU]/);
  });
  it("retries on collision", async () => {
    let calls = 0;
    const id = await uniquePublicId(async () => ++calls < 3);
    expect(id).toMatch(PUBLIC_ID_RE);
    expect(calls).toBe(3);
  });
  it("gives up after too many collisions", async () => {
    await expect(uniquePublicId(async () => true, 3)).rejects.toThrow();
  });
});
