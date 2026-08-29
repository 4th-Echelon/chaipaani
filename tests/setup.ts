import { afterAll, beforeEach } from "vitest";
import { getDb, resetDbForTests } from "../lib/db/client";
import { seedTaxonomy } from "../lib/db/seed";
import { _resetDeptCache, invalidateCache } from "../lib/data";
import { _clearKeyCache } from "../lib/reporting/anon";

(process.env as Record<string, string>).NODE_ENV = "test";

/** Fresh in-memory PGlite with taxonomy (no demo reports) before every test. */
beforeEach(async () => {
  await resetDbForTests();
  invalidateCache();
  _resetDeptCache();
  _clearKeyCache();
  const db = await getDb();
  await seedTaxonomy(db);
});

afterAll(async () => {
  await resetDbForTests();
});
