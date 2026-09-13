# Launch readiness — 13 September 2026

## Local login and GitLab follow-up

- Verified GitLab import HEAD matches the previous release commit 31221bd. Added the gitlab remote and a Node 22 GitLab CI pipeline; Git transport is currently encountering TLS errors, so publication/hosted CI of this follow-up must be verified separately.
- Replaced password-only custom staff sign-in with Clerk's supported component, including account switching, server errors and retries. Admin PIN and database authorization remain enforced. Role mismatch now reports a setup error instead of silently continuing toward a redirect loop.
- Added check:local and a complete screen/account/integration/deployment handbook in README.md.
- Found simultaneous local Cyndy servers and Next cache corruption. Development, isolated development and production now use separate generated directories. Only the isolated preview remains in use for this verification.
- Local configuration is missing ADMIN_PIN_HASH and UPSTASH_REDIS_REST_TOKEN. Read-only isolated database checks succeeded and found two client profiles, with no administrator or worker profiles. Those staff accounts still require explicit provisioning.
- Clerk development publishable/secret keys were verified against matching signing keys. Browser sign-in renders, but a signed-in browser's account lookup has also returned an unavailable response; successful authenticated client/worker/admin workflows are NOT yet verified.
- 28 regression tests passed. The production build and TypeScript checks passed for the staff login/cache changes. Follow-up safe server logging identifies only the failing stage/error code, never credentials or profile details.

## Previous launch pass


**Not yet approved for public launch.** Engineering changes are implemented and undergoing release verification. Production services, credentials and authenticated end-to-end testing still require the steps in [LAUNCH.md](LAUNCH.md).

## Completed in this launch pass

- Removed credential-like values from the environment template and added a secret scanner. No populated environment file is intended for GitHub. The old credentials still require rotation.
- Pushed the launch implementation to `salaudeenabdulkabir/cyndy-edu` on `main`. Created the dedicated `cyndy-edu` Next.js project in Vercel; deployment has not started.
- Generated a schema baseline and incremental migrations. Created the isolated Neon branch `launch-readiness-2026-09-12`; production was unchanged.
- Added database uniqueness for client packages, application slots and document types per application. Profile and package initialization handle concurrent creation safely.
- Added administrator package allocation for one to three applications and client application switching. Package allocation does not itself approve payment.
- Added document-checklist administration, per-requirement format enforcement and 4 MB upload limits compatible with Vercel request limits.
- Added signed Clerk webhook synchronization. Existing roles and manual deactivation are preserved.
- Added mandatory initial worker password replacement and API guards, including administrator PIN checks on worker APIs used by admins.
- Added transactional notification/audit triggers, a notification inbox, an authenticated scheduled email/reminder job with leasing and bounded retries, and a basic audit viewer. No emails were sent.
- Added import preview with validation/duplicate indications and transaction-serialized duplicate prevention for program imports.
- Added spreadsheet-safe CSV export and authorized printable application copies with browser Save as PDF.
- Added a real support page using `cyndyeducationalpathways7@gmail.com`, complete draft policy pages, versioned policy acceptance and a submission guard while policies await approval.
- Added installable-app icons and a service worker that caches only a generic offline page. Applicant pages, APIs and documents are never stored in its cache.
- Added CI, Vercel build configuration, production environment checks, a basic health endpoint and server error logging that omits raw SQL, credentials and applicant answers.
- Removed unconnected Trigger SDK dependency and excluded legacy job code from the app build. Removed unverified landing-page success statistics and fixed the administrator's stale payment filter.

## Verification evidence

- 26 local regression tests passed; lint and TypeScript passed during this pass. The final production build passed after the mobile contact-page overflow fix.
- Production-mode HTTP checks returned 200 for the home, contact, policy and health routes, and 401 for anonymous application, admin, worker and notification-job API requests. The checked responses included `X-Content-Type-Options: nosniff`.
- Inspected the home and contact pages at a 375 px mobile viewport. Fixed the long support email overflowing its container and confirmed the contact document now fits the viewport. This is a limited public-page check, not complete authenticated UI coverage.
- The publishable-file secret scanner passed for 125 text files. GitHub Actions did not execute any steps: GitHub reports that the account is locked due to a billing issue. Hosted CI remains unverified until billing is resolved and the workflow reruns.
- Production dependency audit: **0 known vulnerabilities** in `audit-production.json` after removing the unused Trigger SDK. Development-tool advisories are evaluated separately; this is not a claim of zero security risk.
- The two incremental migrations were applied to the isolated Neon branch. All three uniqueness constraints were verified valid.
- The approved database regression test created temporary fake records, verified duplicate-slot rejection, notification creation and audit records, and rolled back all fixtures. No test emails or production applicant decisions were made.
- Production environment checking correctly fails for development Clerk keys, missing PIN/Redis token, missing approved policies/cron secret, and the lack of a production domain.
- Full authenticated client/worker/admin browser workflows, actual R2 uploads/downloads, email delivery and live production configuration remain unverified.

## Hard launch blockers

1. Vercel workspace is Hobby. This business service needs a commercial-eligible plan; the dashboard also shows a billing-address notice. Resolve the separate GitHub billing lock so release checks can run.
2. Clerk production requires a domain the business owns. A `.vercel.app` address can be a development preview, not this app's production authentication domain.
3. Rotate exposed credentials, configure live Clerk/webhook keys, Redis URL/token, a new private admin PIN hash, and verified email delivery settings.
4. Verify R2 is private, disable all public bucket access and add a tested malware-scanning/quarantine workflow. File signatures are not malware scanning.
5. Approve the drafted terms/privacy policy and assign operational owners for refunds, privacy requests and retention reviews. The draft assumes Nigeria; verify that assumption.
6. Adopt migration history for the existing schema, create rollback protection, rehearse restore and obtain production migration approval. Do not apply the baseline creation SQL to the existing database.
7. Complete the isolated authenticated workflow checklist, deploy a protected preview and verify the exact commit before opening registration.

## Remaining scope and limits

Document-checklist UI currently creates global requirements; more complete program-specific editing and checklist versioning remain. Audit records identify database operations and targets but do not provide complete actor attribution or an immutable external archive. Email queue throughput and retries require staging/load verification. Automated retention deletion, production malware scanning, Freshdesk ticketing, push notifications and third-party analytics/error-monitoring accounts are not fully connected. Existing overwritten legacy optional-section answers cannot be reconstructed automatically.

The first engineering pass additionally hardened administrator authorization, client update allowlists, submission validation, note redaction, payment confirmation, upload signatures/rate limits, serial autosave recovery, mobile navigation and security headers. Those controls are retained.

Read [LAUNCH.md](LAUNCH.md) for the account-by-account steps, policy review, testing and rollback procedure. Do not bypass failing launch gates simply to meet the deadline.
