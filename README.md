<p align="center">
  <a href="https://www.chaipaani.fyi">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-white.png">
      <img src="public/brand/logo-black.png" alt="Chai Paani" width="340">
    </picture>
  </a>
</p>

<p align="center">
  India's crowdsourced registry of what bribes really cost.<br>
  Anonymous reports, aggregated into department rankings, city breakdowns and service-level averages.
</p>

<p align="center">
  <a href="https://www.chaipaani.fyi"><b>chaipaani.fyi</b></a> ·
  <a href="https://www.chaipaani.fyi/report">File a report</a> ·
  <a href="https://www.chaipaani.fyi/data">Open data</a>
</p>

<p align="center">
  <img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-8fd98a">
  <img alt="Next.js 14" src="https://img.shields.io/badge/Next.js-14-101211">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Drizzle-101211">
  <img alt="No tracking" src="https://img.shields.io/badge/tracking-none-8fd98a">
</p>

---

Chai Paani is a public ledger of petty corruption. People report the bribes they were asked to pay (or refused to pay) for everyday government services: a driving licence, a police verification, a property registration, a birth certificate. The reports are anonymised, moderated, clustered for corroboration, and published as open data that anyone can audit.

No accounts. No ads. No tracking. Everything a reader sees can be downloaded as CSV or JSON.

## How anonymity works

The site is designed so that even its operators cannot identify a reporter.

- There are no user accounts and no cookies for visitors.
- The client IP is hashed with HMAC-SHA256 under a key generated fresh each UTC day and deleted after two days (`hash_keys`). Raw IPs are never stored or logged. After the key is gone, the hash cannot be reversed or correlated.
- Free-text notes are scrubbed for phone numbers, emails and identifiers before storage. Text that looks like it names a person is held for human review and never auto-published.
- Evidence files (UPI statements) are parsed in memory and never written to disk. Only the matched transaction's SHA-256 UTR hash, amount, date and normalised counterparty are kept.

## Reporting pipeline

```
POST /api/reports
  validate (zod, field errors)           lib/reporting/schema.ts
  Turnstile (skipped when unset)         lib/reporting/turnstile.ts
  rate limit 3/day per hashed network    lib/reporting/ratelimit.ts
  PII scrub + possible-name detection    lib/reporting/pii.ts
  insert (public_id CP-XXXX)             lib/reporting/submit.ts
  corroborate                            lib/reporting/corroborate.ts
```

Every submission enters the moderation queue as `held` and appears publicly only after a moderator publishes it. Submissions return a one-time `evidence_token`; it is the only way to attach evidence later, and only its SHA-256 hash is stored.

Reports are never called "verified". The trust ladder is:

| Tier | Meaning |
| --- | --- |
| `reported` | A single anonymous report |
| `corroborated` | Three or more reports from distinct networks, same department, city, service and 30-day window |
| `evidence_backed` | A UPI statement matched the reported transaction with a score of 80+ |

Readers can vote (`POST /api/vote`, unique per report, kind and network hash); five fake flags exceeding helpful votes hold a report automatically. Anyone named in a report can file a takedown (`POST /api/takedowns`), which holds it immediately pending a moderator's decision.

## What else is here

- **Statistics snapshots.** Public pages never run aggregate SQL per request. Every number comes from the `stats_snapshots` table, one indexed row per statistic, refreshed by write triggers, a scheduled job and `npm run jobs:refresh-stats`. `GET /api/health?deep=1` shows each snapshot's age.
- **Complaint letters.** `POST /api/complaint` drafts a formal complaint addressed to the state Lokayukta / ACB and the CVC from a published report.
- **Open data.** `GET /api/dump/latest.csv|json` exports all published reports, public fields only.
- **Moderation.** `/admin` (HTTP Basic auth) lists held, published and removed reports with publish, remove and hold actions. Every action is written to an audit log.

## Security model

- **Evidence tokens.** 32 random bytes, base64url, returned once at submission. Only `sha256(token)` is stored; comparison is constant time; uploads are refused 30 days after filing.
- **Admin CSRF.** State-changing admin requests must be same-origin (`Sec-Fetch-Site`, with an `Origin` fallback). Redirect targets accept only relative same-origin paths.
- **Brute force.** Failed admin logins are counted per client (10 per 15 minutes) and delayed. In production, pair with an edge rate-limiting rule on `/admin*`.
- **File parsing.** 5 MB cap, magic-byte sniffing, 30-page and 8-second PDF limits, 2 MB cap on extracted text.
- **Search.** ILIKE wildcards are escaped; terms are capped and length-checked.
- **Takedown abuse.** Takedowns have their own daily limit per network; after a rejection, repeat requests within 30 days are logged but do not re-hold the report.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:3000, embedded PGlite, demo data seeded on first boot
npm test             # vitest, 62 tests against in-memory PGlite
npm run build
```

Nothing is required for local development. Copy `.env.example` to `.env.local` to configure:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (falls back to embedded PGlite in dev) |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Enables `/admin` |
| `TURNSTILE_SECRET` | Enforces the human check on submissions |
| `CRON_SECRET` | Authorises `GET /api/cron/refresh-stats` |
| `REQUIRE_APPROVAL` | Pre-moderation, on by default; set `0` to auto-publish |

Scripts: `db:migrate` (apply `drizzle/*.sql`), `db:seed` (taxonomy and demo reports, idempotent), `db:generate` (drizzle-kit diff after editing `lib/db/schema.ts`), `jobs:corroborate` (recompute clusters), `jobs:dump` (write open-data exports), `jobs:refresh-stats` (recompute statistics snapshots).

## Adding a UPI parser

1. Create `lib/evidence/parsers/<provider>.ts`. For CSV exports extend `GenericCsvParser` with a column map; for other formats implement `TransactionParser` (`canParse`, `parse`).
2. Register it in `lib/evidence/registry.ts` before the generic parsers.
3. Add a synthetic fixture under `tests/fixtures/` (no real statements) and a test case.

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, Drizzle ORM on PostgreSQL (embedded PGlite for dev and tests), deployed serverless. Hand-written SQL migrations in `drizzle/`.

## License

[AGPL-3.0](LICENSE). If you run a modified version of this software as a service, you must publish your changes. That is deliberate: a transparency site should itself be transparent.

<p align="center"><sub>A Fourth Echelon Initiative</sub></p>
