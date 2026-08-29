import { getDb } from "../lib/db/client";
import { seedAll } from "../lib/db/seed";

process.env.SEED_ON_BOOT = "0";
getDb()
  .then((db) => seedAll(db))
  .then((r) => {
    console.log(`seeded taxonomy; inserted ${r.reports} reports`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
