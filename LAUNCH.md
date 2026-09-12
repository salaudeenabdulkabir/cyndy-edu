# Two-day launch guide — Cyndy Educational Pathways

## Current release decision

Do not open production registration yet. The code builds and the isolated database migrations have been tested, but production account setup, credential rotation, private storage verification and full authenticated testing remain required.

## 1. Domain and hosting

1. Buy a domain you control. Clerk production cannot use a `.vercel.app` domain. The temporary Vercel address can be used for previews with development keys.
2. In Vercel, use a commercial-eligible plan. Hobby is for personal/non-commercial use. The connected workspace currently shows Hobby and a billing-address notice; resolve these in your account.
3. The dedicated `cyndy-edu` Next.js project has been created in Vercel and linked to `salaudeenabdulkabir/cyndy-edu`. Deployment has not been started. Keep the existing sites connected to the older `Cyndy` repository separate.
4. Use Node.js 22, install command `npm ci`, and the repository's `npm run build:vercel` build command. Connect your new domain in Project Settings → Domains and add the DNS records Vercel displays.
5. Keep preview deployment protection enabled. Preview variables must point to isolated services, never the production database or document bucket.

Sources: https://clerk.com/docs/guides/development/deployment/vercel and https://vercel.com/legal/terms

GitHub Actions is also blocked: the first release-check run did not start because GitHub reports the account is locked due to a billing issue. Resolve this in GitHub Settings → Billing, then rerun Release checks. Local checks do not establish that hosted CI has passed.

## 2. Rotate the exposed credentials

The old `.env.example` contained credential-like values. The cleaned repository does not contain them. Removal does not revoke credentials. In the corresponding dashboards, rotate/revoke the old Clerk secret, Neon role password, R2 access key/secret, Resend API key and unused UploadThing token. Update the new values directly in Vercel's environment-variable manager; do not paste them into chat.

Clerk production is a separate instance with new keys. Development credentials and users are not production credentials and users.

## 3. Authentication and administrator access

1. Create Clerk production for the purchased domain. Follow Clerk's DNS checklist until verification succeeds.
2. Configure email/password registration and the intended name fields. Require suitable staff account security. Do not use client-editable metadata for roles.
3. Add `/api/webhooks/clerk` and subscribe to `user.created`, `user.updated` and `user.deleted`. Save the endpoint's signing secret as `CLERK_WEBHOOK_SECRET`.
4. Configure both live Clerk keys in Vercel. Set the sign-in/sign-up paths from `.env.example`.
5. Create the administrator account, then have its Clerk public role metadata and database role set to `admin`. Confirm the account's Clerk ID exactly; never grant admin to an email typed without verification.
6. Configure an Upstash Redis database. Save both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
7. Run `node scripts/admin-pin.cjs` in your own interactive terminal. It hides the PIN input and generates a bcrypt hash. Save only the hash as `ADMIN_PIN_HASH`. Choose a NEW PIN; never reuse the old public/default PIN.
8. Test admin login, three wrong PIN attempts, lockout, session expiration and logout. Workers must change their temporary password before application access.

## 4. Database migration and rollback

Project: `summer-wildflower-24840639`.
Isolated rehearsal branch: `launch-readiness-2026-09-12` (`br-still-field-aeb5cjx5`).
Original production branch: `br-broad-lake-aeijxm38`; its schema/data were not changed by this work.

- `0000_baseline.sql` creates the original schema for a NEW database only. Do not apply it to the existing production schema.
- `0001_launch_integrity.sql` adds application slots and uniqueness constraints.
- `0002_notifications_audit.sql` adds delivery fields, an audit table and transactional event triggers.
- The two incremental migrations were applied to the isolated branch. Unique indexes were checked; a fake-record transaction verified duplicate-slot rejection, notification creation and audit records, then rolled back its fixtures.
- Migration journal adoption for the existing database remains a release step: compare its full schema with the baseline, register the verified baseline in the migration ledger, and then apply the incremental migrations in order. Do not run `db:push` to bypass migration history.
- Before production changes, create a rollback branch/snapshot and verify the restore procedure. The connected project reported a six-hour history retention window; do not rely on that alone as a long-term backup.
- Restore by switching the deployment back to its last known-good version and restoring/switching the database only when necessary. Account for legitimate applications received after the rollback point. Do not drop new columns or tables as a blind rollback.

Local isolated preview: `node scripts/start-staging.cjs` uses ignored `.env.staging.local` on port 3001.

## 5. Document storage

1. Rotate R2 credentials. Restrict the replacement token to the required private bucket.
2. Disable the bucket's public r2.dev URL and any public custom domain. Existing public links are not revoked by changing the application code.
3. Configure a separate private test bucket for end-to-end tests.
4. Verify valid/invalid PDF/JPG/PNG uploads, 4 MB limits, replacement, failed upload recovery and signed URL expiration. Vercel's request limit is 4.5 MB, so this app caps files below that boundary.
5. Add and verify a malware scanning/quarantine service before production documents are accepted. MIME signatures alone are not malware protection. Do not send passports or applicant documents to public scanning services.
6. Assign an owner to the retention review process in the privacy policy. Automated permanent deletion is not enabled.

Source: https://vercel.com/docs/functions/limitations

## 6. Email, jobs and monitoring

- Support/privacy inbox: `cyndyeducationalpathways7@gmail.com`.
- Verify a domain in Resend. Set `EMAIL_FROM` to a verified sender and `RESEND_API_KEY` to the rotated credential. Gmail can be the reply/support inbox; it is not a substitute for a verified Resend sending domain.
- Generate a long random `CRON_SECRET` in the hosting secret manager. The notification job requires its bearer token.
- Leave `EMAIL_NOTIFICATIONS_ENABLED=false` until a test delivery to an approved test recipient succeeds. No emails were sent during this work.
- `vercel.json` schedules the delivery/reminder job hourly. This requires a plan that supports that schedule. Each run leases at most 10 messages, retries failed messages up to five times and uses a provider idempotency key. Increase throughput only after measuring the queue. Provider idempotency has a finite retention window; investigate ambiguous deliveries before manual retries.
- Use `/api/health` for basic HTTP uptime checks. This checks the app process, not every dependency. Inspect Vercel logs and delivery failures daily during launch. Error logging omits SQL parameters, credentials and applicant answers.
- Audit records capture changed database records and operations, but do not yet capture complete actor attribution or provide an immutable external audit archive.

## 7. Policy approval

Read `/privacy-policy` and `/terms-of-service` in the preview. The draft assumes the service operates in Nigeria, reviews abandoned drafts after 90 days and closed applications after 12 months, and sets fair cancellation/refund review times. Confirm these fit actual operations, including any statutory record-keeping and cross-border processing requirements. A staff member must own retention reviews and privacy requests.

Only after final review, set `LEGAL_POLICIES_APPROVED=true`. Submission remains unavailable without that flag and a support inbox. The server records the policy version and acceptance time.

## 8. Final release checks

1. `npm run check:secrets` — no detected credentials in publishable text.
2. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
3. `npm audit --omit=dev` and review the full development-tool audit separately.
4. `npm run check:production` — all required configuration must pass. This does not replace live connection tests or policy review.
5. Use disposable client, worker and admin accounts on isolated services. Test registration → package allocation → receipt upload/rejection/replacement/confirmation → application save/reload/switch → required documents → submission → assignment → review → notifications → print/CSV export → logout and revoked access. Verify another client's records and documents cannot be accessed.
6. Test mobile and desktop, keyboard navigation, slow/offline network recovery and expired sessions. The service worker only caches a generic offline page, never applicant pages/documents.
7. Deploy a protected preview, verify it, then approve the production migration and deploy the same verified commit. Recheck the custom domain, Clerk redirects, webhook deliveries and signed downloads.
8. Open public registration only when all blockers are resolved. Keep someone available to monitor support and failed requests throughout the first launch day.

## Remaining advanced integrations

Freshdesk ticketing, push notifications, third-party analytics/error-monitoring account setup, complete actor-attributed audit trails, production malware scanning and automated retention are not fully connected. The portal provides a support page, in-app notifications, email-job code, basic health checks and operational logs; these are not claims that those external integrations have been deployed.
