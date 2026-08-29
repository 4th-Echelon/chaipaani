import { getDb } from "../lib/db/client";
import { refreshSnapshots } from "../lib/stats/snapshot";

process.env.SEED_ON_BOOT = "0";
getDb()
  .then((db) => refreshSnapshots(db))
  .then((summary) => {
    for (const s of summary) console.log(`${s.ok ? "ok  " : "FAIL"} ${s.key.padEnd(9)} ${s.ms} ms${s.error ? `  ${s.error}` : ""}`);
    process.exit(summary.some((s) => !s.ok) ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
