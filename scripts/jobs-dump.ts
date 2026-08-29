import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { getDb } from "../lib/db/client";
import { dumpRows, rowsToCsv } from "../lib/dump";

process.env.SEED_ON_BOOT = "0";
const outDir = process.env.DUMP_DIR ?? path.join(process.cwd(), "..", "..", "data");

getDb()
  .then((db) => dumpRows(db))
  .then((rows) => {
    mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const csv = rowsToCsv(rows);
    const json = JSON.stringify({ generated_at: new Date().toISOString(), count: rows.length, reports: rows }, null, 1);
    writeFileSync(path.join(outDir, `reports-${stamp}.csv`), csv);
    writeFileSync(path.join(outDir, `reports-${stamp}.json`), json);
    writeFileSync(path.join(outDir, "latest.csv"), csv);
    writeFileSync(path.join(outDir, "latest.json"), json);
    console.log(`wrote ${rows.length} reports to ${outDir}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
