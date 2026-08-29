# Chai Paani web

Next.js 14 (App Router) frontend and reporting backend for Chai Paani, India's crowdsourced registry of what bribes really cost.

## Run

```bash
npm install
npm run dev          # http://localhost:3000, embedded PGlite in ./.pglite, demo data seeded on first boot
npm test             # vitest against in-memory PGlite
npm run build
```

Copy `.env.example` to `.env.local`. Nothing is required for local development; set `DATABASE_URL` for PostgreSQL, `ADMIN_USER` / `ADMIN_PASSWORD` to enable `/admin`, `TURNSTILE_SECRET` to enforce the human check.

Scripts: `db:migrate` (apply `drizzle/*.sql`), `db:seed` (taxonomy + demo reports, idempotent), `db:generate` (drizzle-kit diff after editing `lib/db/schema.ts`; commit the SQL it emits), `jobs:corroborate` (recompute clusters), `jobs:dump` (write `data/reports-YYYY-MM-DD.{csv,json}` and `latest.*`).

## Reporting pipeline

```
POST /api/reports
  validate (zod, field errors)           lib/reporting/schema.ts
  Turnstile (skipped when unset)         lib/reporting/turnstile.ts
  rate limit 3/day per hashed network    lib/reporting/ratelimit.ts   (rate_limits table)
  PII scrub + possible-name detection    lib/reporting/pii.ts
  insert (public_id CP-XXXX)             lib/reporting/submit.ts
  corroborate                            lib/reporting/corroborate.ts
```

- Reports that look like they name a person are stored with `status = held` and appear in the moderation queue; they are never rejected and never public until a moderator publishes them.
- The client IP is hashed with HMAC-SHA256 under a key that is generated per UTC day and deleted after two days (`hash_keys`). Raw IPs are never stored or logged.
- Corroboration clusters reports by department, city, first three words of the service and a 30-day window; three reports from three distinct hashes promote the whole cluster to `corroborated`. Nothing is ever called "verified".
- Votes (`POST /api/vote`) are unique per (report, kind, hash). Five fake flags exceeding helpful votes hold the report automatically.
- Evidence (`POST /api/reports/{id}/evidence`, multipart `file`, CSV or PDF, 5 MB) is parsed in memory; only the matched transaction's SHA-256 UTR hash, amount, date and normalised counterparty are stored, and the report becomes `evidence_backed` when the match score is 80 or more. The file never touches disk.
- Takedowns (`POST /api/takedowns`) hold the report immediately; moderators decide at `POST /api/admin/takedowns/{id}/decide`.
- Complaint letters (`POST /api/complaint {public_id}`) address the state Lokayukta / ACB and the CVC (`lib/complaint/authorities.ts`; entries marked `verify` need checking).
- Open data: `GET /api/dump/latest.csv|json` and the `jobs:dump` script, public fields only.

## Moderation

`/admin` (HTTP Basic via `middleware.ts` and `lib/admin/auth.ts`) lists held, published or removed reports with publish / remove / hold. JSON API under `/api/admin/*`: `queue`, `reports/{id}` (PATCH edit, logged with before/after), `reports/{id}/{publish|remove|hold}`, `log`, `takedowns`, `takedowns/{id}/decide`.

## Data layer

`lib/db/schema.ts` (Drizzle) is the source of truth; `drizzle/0000_init.sql` is the hand-written initial migration that runs on PostgreSQL and PGlite. `lib/db/client.ts` picks the driver from the environment and applies migrations on first use. `lib/data.ts` exposes read-only `store` with a 60 second in-process cache; writes go through `lib/reporting`, `lib/evidence` and `lib/admin`.

## Adding a UPI parser

1. Create `lib/evidence/parsers/<provider>.ts`. For CSV exports extend `GenericCsvParser` and pass a column map; for other formats implement `TransactionParser` (`canParse`, `parse`) and return normalised `Transaction`s.
2. Register it in `lib/evidence/registry.ts` before the generic parsers.
3. Add a synthetic fixture under `tests/fixtures/` (no real statements) and a case in `lib/evidence/parsers.test.ts`.
# chaipani



## Statistics snapshots

Public pages never run aggregate SQL per request. Every number on the homepage,
department, city and compare pages comes from the `stats_snapshots` table
(one indexed row per statistic), read with a single SELECT and cached in
process for 60 seconds. On a brand-new database the first request computes a
missing snapshot once and stores it.

Snapshots are refreshed by:

- Vercel Cron: `.github/workflows/refresh-stats.yml (GitHub Actions schedule; Vercel Cron is a paid feature)` schedules `GET /api/cron/refresh-stats` every
  10 minutes. Set `CRON_SECRET` in the project environment; Vercel sends it as
  `Authorization: Bearer <secret>`.
- Writes: a successful report submission, an auto-hold from fake flags, and
  every moderation action schedule a debounced background refresh (at most one
  per minute per instance). The request never waits for it.
- Manually: `npm run jobs:refresh-stats`, or `curl -u $ADMIN_USER:$ADMIN_PASSWORD https://<host>/api/cron/refresh-stats`.

`GET /api/health?deep=1` lists each snapshot's age and compute time.
