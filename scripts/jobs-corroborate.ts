import { getDb } from "../lib/db/client";
import { recomputeAll } from "../lib/reporting/corroborate";

process.env.SEED_ON_BOOT = "0";
getDb()
  .then((db) => recomputeAll(db))
  .then((r) => {
    console.log(`recomputed ${r.reports} reports into ${r.clusters} clusters`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
