# Roadmap

Where Chai Paani is headed. This is directional, not a promise with dates. If something here matters to you, open an issue, or better, a PR. Items move between sections as reality intervenes.

## Now: launch hardening

Getting from "deployed" to "trustworthy at scale".

- **Turnstile in production.** The human check on submissions is built but runs open until keys are configured. Required before wide launch.
- **Clear the demo data.** The live site currently carries seeded demo reports so the pages are not empty. They get wiped the moment real reports start flowing.
- **Verify complaint authorities.** Addresses for state Lokayuktas, ACBs and the CVC in `lib/complaint/authorities.ts` are drafted from public sources; entries marked `verify: true` need checking against the bodies' current websites before complaint letters go out with them.
- **Edge rate limiting on `/admin*`.** The in-app brute-force counter is per serverless instance and is only a speed bump. A Cloudflare rate-limiting rule is the real layer.
- **Error monitoring.** Server-side error reporting with PII-safe scrubbing, so production failures are seen without logging anything about reporters.

## Next: depth

- **More UPI parsers.** PhonePe, GPay and generic CSV are covered. Paytm, BHIM and the common bank statement PDF layouts are not. Each new parser widens who can upgrade a report to `evidence_backed`. See "Adding a UPI parser" in the README; this is the single best first contribution.
- **Hindi, then regional languages.** A corruption registry for India that only speaks English is talking to the wrong audience. Start with the report form and confirmation flow, then the public pages.
- **Trends over time.** The snapshot system stores current aggregates. Keeping dated history enables the more interesting question: is department X getting better or worse?
- **Per-department and per-city feeds.** RSS/Atom for new published reports in a place or department, so journalists and RTI activists can watch what they care about without accounts or tracking.
- **Public API documentation.** The read API (`/api/reports`, `/api/stats/*`, `/api/dump/*`) is stable and open; it deserves a documented contract page.

## Later: institutions

- **Multi-moderator accounts.** Moderation is a single shared HTTP Basic credential today. Real moderator identities with per-action attribution in the audit log, without ever touching reporter identity.
- **RTI integration.** Corroborated clusters are natural RTI targets. Generate ready-to-file RTI applications the way complaint letters are generated today.
- **Researcher exports.** Bulk historical dumps with documented methodology notes, so the data is citable in journalism and academic work.
- **Self-hosting guide.** The AGPL license means anyone can run their own instance. A proper guide (database setup, moderation policy template, legal notes) makes that real for other countries and contexts.

## Non-goals

Things this project will not do, so nobody has to ask.

- **No user accounts.** Ever. Anonymity is the product.
- **No ads, no analytics, no trackers.** Same.
- **No "verified" label.** The trust ladder stops at `evidence_backed`. The site reports claims and their corroboration; it does not adjudicate truth.
- **No naming private individuals.** Reports name departments, offices and roles. Text that appears to name a person is held for review by design.
