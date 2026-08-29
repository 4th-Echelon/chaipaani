# Database layer

- `schema.ts`: Drizzle schema (source of truth for types).
- `../../drizzle/*.sql`: migrations, applied in filename order by `client.ts` on first use and tracked in `_migrations`. The initial file is hand-written so it runs on both PostgreSQL and PGlite; later ones can come from `npm run db:generate`.
- `client.ts`: `getDb()` returns a migrated singleton. `DATABASE_URL` selects postgres-js; otherwise PGlite (file-backed in `./.pglite` for dev, in-memory under `NODE_ENV=test`). In dev the empty database is seeded on first boot (`SEED_ON_BOOT=0` disables).
- `taxonomy.ts`: departments, states/UTs with ISO codes, seed cities.
- `seed.ts` / `seedData.ts`: idempotent taxonomy + demo report seed (`npm run db:seed`).

Rules every adapter keeps:

- Raw IPs are never persisted; only `ip_hash` from `lib/reporting/anon.ts` (daily key, deleted after two days).
- `status = removed` rows are never returned by any public read; `held` rows only to moderators.
- Uploaded evidence files are never written anywhere; `evidence_matches` holds a UTR hash, amount, date and normalised counterparty only.
