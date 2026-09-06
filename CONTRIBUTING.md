# Contributing to Chai Paani

Thanks for being here. This project runs on volunteers, and the bar to help is deliberately low: the whole stack runs on your machine with zero configuration, and there is meaningful work at every skill level, including work that needs no code at all.

## Ground rules (read this first)

Chai Paani protects people who report corruption. Every PR is reviewed against these constraints, and they are not negotiable:

- **Never store or log a raw IP address, user agent fingerprint, or anything that identifies a reporter.** The only identity-adjacent data allowed is the daily-rotating HMAC hash in `lib/reporting/anon.ts`.
- **No analytics, no trackers, no third-party scripts** beyond the Cloudflare Turnstile challenge. This includes "harmless" things like font CDNs with tracking and error reporters that capture request bodies.
- **Evidence files never touch disk.** Statement parsing stays in memory; only the matched transaction's hashes and fields are stored.
- **No "verified" language.** Reports are `reported`, `corroborated` or `evidence_backed`. The site publishes claims and their corroboration; it does not adjudicate truth.
- **Names of private individuals never auto-publish.** Anything that weakens the possible-name hold in `lib/reporting/pii.ts` will be rejected.

PRs that violate these get closed regardless of code quality. If you are unsure whether an idea crosses a line, open an issue and ask before building.

## Getting set up

```bash
git clone https://github.com/4th-Echelon/chaipaani.git
cd chaipaani
npm install
npm run dev     # http://localhost:3000, embedded database, demo data seeded on first boot
npm test        # 62 tests, in-memory database, no setup
```

There is no step three. You do not need PostgreSQL, Docker, or any environment variables to develop. To try the admin panel locally, set `ADMIN_USER` and `ADMIN_PASSWORD` in `.env.local` and open `/admin`.

## Where to start

- **Best first contribution: a UPI parser.** PhonePe and GPay exports are covered; Paytm, BHIM and bank statement formats are not. It is a self-contained module with an existing pattern to copy and synthetic fixtures to test against. See "Adding a UPI parser" in the README.
- **No-code contribution: verify complaint authorities.** `lib/complaint/authorities.ts` holds addresses for state Lokayuktas and ACBs. Entries marked `verify: true` need checking against the bodies' current public websites. This directly affects whether generated complaint letters reach the right desk.
- **Translations.** Hindi first, then regional languages, starting with the report form.
- Check the [roadmap](ROADMAP.md) and the issue tracker for everything else. Issues labeled `good first issue` are scoped to be finishable in an evening.

## Project layout

| Path | What lives there |
| --- | --- |
| `app/` | Next.js App Router pages and API routes |
| `lib/reporting/` | Submission pipeline: validation, PII scrub, anonymisation, rate limits |
| `lib/evidence/` | UPI statement parsers and the transaction matcher |
| `lib/admin/` | Moderation queue, actions, audit log, CSRF |
| `lib/db/` | Drizzle schema and driver selection (PostgreSQL or embedded PGlite) |
| `lib/stats/` | Precomputed statistics snapshots |
| `drizzle/` | Hand-written SQL migrations |
| `tests/` | Vitest suites; fixtures are synthetic, never real statements |

## Pull requests

- Run `npm run typecheck && npm test` before pushing; CI runs the same plus a production build.
- New behavior needs a test. Bug fixes need a test that fails without the fix.
- Keep PRs focused; a parser, a fix or a page per PR beats a grab bag.
- Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, and commit the SQL it emits.
- Test fixtures must be synthetic. Never commit a real bank or UPI statement, even your own.

## Reporting a security issue

Do not open a public issue for vulnerabilities. Use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"). Anything that could deanonymise a reporter is treated as the highest severity.
