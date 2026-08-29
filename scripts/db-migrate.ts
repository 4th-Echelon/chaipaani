import { getDb } from "../lib/db/client";

process.env.SEED_ON_BOOT = "0";
getDb()
  .then(() => {
    console.log("migrations applied");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
