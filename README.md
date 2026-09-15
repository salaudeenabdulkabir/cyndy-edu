# Cyndy Educational Pathways — project handbook

Cyndy is a Next.js application for international education applications, payment-receipt review, document collection, staff processing and applicant updates. This handbook covers the implemented screens, account setup, local development and the GitLab → Vercel deployment path.

**Release status:** local configuration is incomplete. The previously missing local admin PIN hash and Upstash REST token were supplied on 15 September 2026; format checks and Redis PING now pass. The selected administrator role has now been aligned between Clerk and the isolated database; the interactive login/PIN test remains pending. A working sign-in screen is not evidence that payment, uploads or all authenticated workflows have passed. See [READINESS.md](READINESS.md) for verification evidence and [LAUNCH.md](LAUNCH.md) for remaining release requirements.

## 1. Where everything lives

| System | Responsibility |
| --- | --- |
| [GitLab project](https://gitlab.com/voltage-group1/cyndy-edu) | Source code and GitLab CI pipeline |
| Vercel | Builds, deployment URLs, runtime environment variables and scheduled job |
| Clerk | Accounts, passwords, verification, sessions and identity webhooks |
| Neon Postgres | Profiles, application answers, packages, catalog, receipts, notifications and audit records |
| Cloudflare R2 | Private document and receipt objects |
| Upstash Redis | Admin PIN sessions, PIN attempt limits and upload rate limits |
| Resend | Outgoing application notification emails |
| Your laptop | Local Next.js server; it still connects to the online services above |

Moving from GitHub to GitLab does not require rewriting the application. It does not copy hosting secrets or fix missing credentials. GitHub Actions and GitLab CI are separate; `.gitlab-ci.yml` provides the checks for GitLab. Vercel's native GitLab integration can deploy directly without a Vercel API token in GitLab CI. Automatic deployment is not proof that the GitLab pipeline passed; review both before promoting a release.

## 2. All screens and access paths

Replace the base address below with `http://localhost:3001` for the isolated local preview, `http://localhost:3000` for ordinary development, or your deployed domain.

| Screen / route | Who uses it | Implemented behavior |
| --- | --- | --- |
| `/` | Public | Service introduction, destinations, sign-in/signup entry points, policy/support links and browser-dependent install prompt |
| `/sign-up` | New clients | Clerk registration and verification according to the configured Clerk instance |
| `/sign-in` | Existing users | Clerk sign-in, password recovery and configured additional verification |
| `/contact` | Public | Support/privacy contact: cyndyeducationalpathways7@gmail.com |
| `/privacy-policy` | Public | Draft privacy notice, retention review and rights/contact information |
| `/terms-of-service` | Public | Draft service, cancellation and refund terms |
| `/apply` | Active client | Creates/loads the client's application; shows payment gate until receipt approval, then the application wizard |
| `/apply?application=<id>` | Owning client | Switches to an application within the purchased allowance; server ownership checks apply |
| `/status` | Client | Application progress/status view |
| `/notifications` | Active signed-in user | Own notification inbox and mark-as-read actions |
| `/applications/<id>/print` | Authorized owner/staff | Printable application details; browser Print → Save as PDF |
| `/admin/login` | Administrator | Clerk sign-in, database role check, then private six-digit PIN |
| `/admin` | Active administrator with PIN session | Payments, applications, workers, clients/packages, catalog and document requirements tabs |
| `/admin/audit` | Active administrator with PIN session | Recent database operation audit records; full actor attribution is not implemented |
| `/worker/login` | Worker | Clerk sign-in and staff role check; existing signed-in accounts can switch accounts |
| `/worker/change-password` | Worker on first login | Replaces temporary password before access to assigned work |
| `/worker` | Active worker after password change | Assigned applications, details, document review and permitted progress updates |
| `/offline.html` | Public/offline | Generic connection-loss page; applicant information is not cached for offline use |
| `/api/health` | Monitoring | Basic process health response; does not prove database, email or storage readiness |

### Client application sections

1. Program selection: choose catalog options or describe a custom course.
2. Personal information.
3. Education background.
4. Awards and achievements (optional).
5. Legal guardians.
6. Work experience (optional).
7. Research experience.
8. Publications (optional).
9. Teaching experience (optional).
10. Certifications (optional).
11. Voluntary experience (optional).
12. Leadership (optional).
13. Clubs and associations (optional).
14. Languages (optional).
15. Document upload: requirements, allowed PDF/JPG/PNG formats and maximum 4 MB per file.
16. Review and submit: required-field/document checks and versioned policy acceptance.

The wizard includes autosave state, retry/recovery behavior, completion progress, mobile navigation and application switching. Submission remains disabled until policies are approved in configuration and the server's payment/completeness checks pass. Payment is currently a receipt-review workflow, not a connected card checkout.

### Administrator tabs

- **Payments:** inspect uploaded receipts; confirm or reject with a reason. Confirmation unlocks the client's application. Use fake receipts only in testing.
- **Applications:** search/filter, view progress and assign workers.
- **Workers:** create a worker with a temporary password; activate/deactivate staff. Account creation writes to Clerk and the database.
- **Clients/packages:** view clients and allocate one to three application slots, amount/currency and notes. Allocation itself does not confirm payment.
- **Catalog:** maintain country/university/program information and review program imports before applying them.
- **Documents:** create global document requirements. Complete program-specific editing/versioning is unfinished.
- **Export:** authorized CSV export with spreadsheet-formula escaping. Treat exported records as private.
- **Audit:** view recent entity/operation records. This is not a complete immutable audit system.

## 3. Login credentials — there is no default admin password

Do not use placeholder emails from examples as real credentials. There is no universal admin, worker or client password. Clerk stores account passwords; the application database stores role/profile information. Never put passwords, PINs or API secrets in this README or GitLab.

### Client setup and login

1. Select the **development** instance in Clerk for local testing.
2. Put that instance's publishable and secret keys in `.env.local`.
3. Start the local server, open `/sign-up`, register a test client and complete verification.
4. Sign in at `/sign-in`. Production users and development users are separate; a production password/account may not exist in development.
5. `/apply` initializes the client's local database profile/package as needed. No staff privilege is granted by registration.
6. An unpaid client should see **Payment confirmation required**. This is expected behavior, not a login failure.
7. Test receipt upload, then approval using an administrator on the same isolated database before testing the wizard.

### First administrator setup

1. Create/sign into the intended administrator account in the SAME Clerk instance used by the app. Use your own email and strong password; complete configured verification.
2. In Clerk → Users, locate that exact account and copy its **Clerk user ID** for verification. An email match alone is not sufficient for granting privileges.
3. An authorized operator must set Clerk **public metadata** to include `"role": "admin"` and provision the matching database `users` row with the exact `clerk_id`, `role = 'admin'` and `is_active = true`. Preserve existing metadata. Never put role in user-editable unsafe metadata.
4. The Clerk webhook deliberately preserves existing database roles and does not grant admin from signup. Changing metadata alone does not promote a database client. Have the engineer verify both records together; do not bulk-promote users or run SQL with unverified IDs.
5. In Upstash, obtain the Redis **REST URL** and **REST token**. Put them in `.env.local` for local use and Vercel's secret manager for the appropriate deployment environment.
6. In your own terminal run `node scripts/admin-pin.cjs`. Choose and confirm a NEW six-digit PIN; input is hidden. Save the resulting bcrypt hash as `ADMIN_PIN_HASH`, never the raw PIN.
7. In `.env.local`, escape every `$` in the hash as `\$`, because Next.js expands dollar variables. In Vercel's environment-variable value field paste the original hash unchanged, without quotes or backslashes. `npm run check:local` detects malformed loaded hashes.
8. Restart the local server after changing `.env.local`.
9. Open `/admin/login`, sign in and enter your PIN. Three attempts are allowed before the server locks attempts for 15 minutes; a verified PIN session lasts four hours.
10. Test logout, wrong-role denial and expired PIN handling before using real records.

### Worker setup and login

1. Sign in as an administrator and open `/admin` → Workers.
2. Create the worker with their name, email and a strong temporary password that meets Clerk requirements.
3. Share credentials through your approved private channel. The application does not automatically email the temporary password.
4. Worker opens `/worker/login` and signs into the correct environment.
5. First login leads to `/worker/change-password`. Complete the password replacement before accessing assignments.
6. Administrator assigns an application. Worker should only see authorized assignments; client and worker A must not be able to read worker B's unrelated applications.
7. Deactivate a test worker and confirm API access is rejected.

## 4. Run locally, step by step

1. Install Node.js 22 and Git. Open a terminal in the project directory.
2. Run `npm ci`.
3. If `.env.local` does not already exist, copy `.env.example` to `.env.local`. **Do not overwrite an existing populated file.**
4. Fill in development/test values using the integration table below. Keep the publishable and secret Clerk keys from the same instance.
5. Run `npm run check:local`. It prints presence/format results, not secrets. Resolve required failures.
6. For the existing isolated Neon branch, use `npm run dev:staging`, then open `http://localhost:3001`. This requires the ignored `.env.staging.local` containing its `DATABASE_URL`.
7. For another intentionally configured development database, use `npm run dev`, then open `http://localhost:3000`. Ordinary `npm run dev` uses `.env.local`'s database; it does not automatically select staging.
8. Use one server per mode. Development now uses `.next-dev`, the isolated development preview uses `.next-staging`, and production builds use `.next`, avoiding the cache collision found during debugging. Stop dev servers before release verification so generated route declarations remain consistent.
9. Run `npm test`, `npm run lint`, `npm run build`, then `npm run typecheck`. Typecheck follows build because Next generates route type files.
10. To inspect the production bundle against the isolated branch, run `node scripts/start-staging.cjs --production` after the build.

The isolated preview launcher prefers IPv4 to work around DNS failures observed on this Windows machine. This does not alter production hosting settings.

Do not mix `localhost` and `127.0.0.1` during a login flow. Cookies belong to their host, and the app checks request origins. Local mode still requires internet connectivity to Clerk, Neon, Upstash and R2.

### Troubleshooting

| Symptom | Check / next action |
| --- | --- |
| Intermittent 404 or build-cache errors | Stop duplicate local servers and restart the intended mode; separate cache directories are now configured |
| Nothing happens or sign-in never loads | Confirm server URL/port, wait for first development compilation, inspect browser error, check internet and Clerk key pair; retry without an extension blocking Clerk |
| Email/password works online but not locally | Check the Clerk instance. Development and production accounts are separate |
| Additional verification requested | Complete Clerk's verification flow; staff login now uses Clerk's supported component |
| Signed in with the wrong account | Use **Sign out and use another account** on the staff login screen |
| Account unavailable / staff access denied | Check database profile, exact Clerk ID, role and active status. Do not weaken guards |
| PIN says security is not configured | Configure `ADMIN_PIN_HASH` plus both Upstash REST values, run `check:local`, restart |
| PIN always fails after copying hash | Escape dollar signs in `.env.local`; check it is the newly selected PIN, not the old public/default PIN |
| Returns to admin login after PIN | Verify Clerk role metadata matches DB role; check Redis reachability, same browser session and cookie origin |
| Client sees payment screen | Expected until administrator confirms a receipt; check both users use the same test database |
| Client API fails with schema error | Confirm the database contains the reviewed incremental migrations; never blindly run baseline SQL on an existing database |
| Receipt/document upload fails | Check R2 credentials/bucket and Redis; use an allowed file signature and size up to 4 MB |
| Submit is disabled | Check required fields/documents, confirmed payment and approved policy configuration |
| Vercel works differently from laptop | Compare environment scopes and code commit. Vercel does not read your laptop's ignored `.env.local` |
| Vercel still uses old keys | Save the new value in the correct environment and redeploy; existing deployments retain their configuration |

## 5. Every integration and key

Set real values **before** the deployment that needs them. To change keys after launch, update the hosting environment values and redeploy. Never add a secret to an admin webpage, source file or `NEXT_PUBLIC_` variable.

| Environment variable | Where to obtain / what it does |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API keys; development `pk_test_` locally, production `pk_live_` in production; this key is intentionally public |
| `CLERK_SECRET_KEY` | Same Clerk instance → API keys; server secret |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → endpoint signing secret; not the API secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in` and `/sign-up`; app routing |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Existing redirect settings; `/apply` for clients; staff screens specify their own redirect |
| `DATABASE_URL` | Neon → Connect → intended branch/database/role; pooled runtime connection |
| `DATABASE_URL_UNPOOLED` | Neon direct connection for reviewed migrations; never a browser variable |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis database → REST API section; both required |
| `ADMIN_PIN_HASH` | Output from `node scripts/admin-pin.cjs`; bcrypt hash only |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 API token/S3 credentials scoped to the required private bucket |
| `CLOUDFLARE_R2_BUCKET_NAME` | Exact private R2 bucket name; use a separate test bucket |
| `RESEND_API_KEY` | Resend → API keys; scoped sending credential |
| `EMAIL_FROM` | Verified Resend domain sender, e.g. a notifications address on your owned domain |
| `EMAIL_REPLY_TO` | Reply-to setting for the legacy email helper; the scheduled job uses `SUPPORT_EMAIL` |
| `SUPPORT_EMAIL` | `cyndyeducationalpathways7@gmail.com`; public support/privacy inbox and job reply-to |
| `NEXT_PUBLIC_APP_URL` | Exact base URL for that environment; production must be HTTPS on your owned domain |
| `NEXT_PUBLIC_APP_NAME` | `Cyndy Educational Pathways`; display configuration |
| `CRON_SECRET` | Generate a long random secret (at least 32 characters); Vercel cron bearer authentication |
| `EMAIL_NOTIFICATIONS_ENABLED` | Keep `false` until controlled delivery testing passes; then set `true` |
| `LEGAL_POLICIES_APPROVED` | Keep `false` until the business approves the published terms/privacy policy; then `true` |

Do not configure obsolete `NEXT_PUBLIC_ADMIN_PIN`, public R2 URLs or unused UploadThing tokens. OneSignal/Trigger/Freshdesk code or references do not mean those integrations are live. The current delivered workflow does not require those optional services.

### Vercel: exactly where to add keys

1. Open the project connected to `voltage-group1/cyndy-edu` (verify repository in Settings → Git).
2. Open **Settings → Environment Variables**.
3. Add each variable name and its value. Choose **Production**, **Preview** or **Development** intentionally.
4. Production uses live Clerk and production services. Preview uses isolated test services. Vercel Development values are not automatically installed on your laptop.
5. Paste secrets directly into Vercel. Do not paste them in chat or commit a populated env file.
6. Save, then create/redeploy the appropriate deployment. Values prefixed `NEXT_PUBLIC_` are bundled at build time; updating settings alone does not update a deployed bundle.
7. Verify sign-in and dependency behavior on the new deployment before directing applicants to it.
8. For rotation, create replacement credentials, update the correct scopes, redeploy/test and revoke the old credentials according to the provider's rotation process. Previously exposed credentials remain a launch blocker.

## 6. GitLab → Vercel, step by step

1. Confirm the GitLab project contains this latest code, `package.json`, `package-lock.json`, `vercel.json`, migration files and `.gitlab-ci.yml`.
2. Do not import `.env.local`, `.env.staging.local`, `node_modules` or `.next`. Run `npm run check:secrets` before a push.
3. Add the GitLab remote if it is missing: `git remote add gitlab https://gitlab.com/voltage-group1/cyndy-edu.git`. Inspect `git remote -v`; keep GitHub as an optional archive until the switch is verified.
4. Fetch GitLab and compare its default branch with the local branch before pushing. Do not force-push over changes made in GitLab. Resolve differences in a reviewed merge.
5. In GitLab → Build/Pipelines, run/check the pipeline. `.gitlab-ci.yml` uses Node 22 and dummy build credentials; no production secrets are required for those checks. Runner availability/verification and usage limits belong to GitLab and must be checked in that account.
6. In Vercel, confirm the linked GitLab project, production branch and root directory `./`; framework is Next.js. Keep unrelated older Cyndy projects separate.
7. Use Node 22, `npm ci` and the repository's `npm run build:vercel` command. The production guard intentionally rejects missing live setup.
8. Configure variables as above. Use a commercial-eligible Vercel plan for this business and an owned domain for Clerk production. GitLab does not change those requirements.
9. Add the domain in Vercel Settings → Domains, then follow Vercel and Clerk DNS verification instructions.
10. Deploy a protected test preview and run the acceptance checklist. Review GitLab's pipeline result and Vercel's build logs separately.
11. Promote the verified release only after migrations, storage/privacy, policies and authenticated tests pass. Record the exact commit and deployment URL.

Official references: [Vercel GitLab integration](https://vercel.com/docs/git/vercel-for-gitlab), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Clerk sign-in component](https://clerk.com/docs/reference/components/authentication/sign-in).

## 7. Database, webhooks, documents and email

- The existing rehearsal branch is `launch-readiness-2026-09-12`. It has incremental migrations 0001 and 0002 applied. Production was not migrated in the previous pass.
- `0000_baseline.sql` is for a NEW database only. Existing databases need verified migration-history adoption; see [LAUNCH.md](LAUNCH.md). Take rollback protection and rehearse recovery before production changes.
- Add Clerk webhook `/api/webhooks/clerk` for `user.created`, `user.updated`, `user.deleted`. A cloud webhook cannot reach plain localhost; client profile initialization helps local client use, but local webhook testing needs a controlled tunnel and a separate test endpoint/signing secret.
- Keep R2 buckets private. Disable public r2.dev/custom-domain access. Signed downloads and MIME checks do not replace malware scanning; quarantine/scanning remains unfinished and must be verified before real documents are accepted.
- The database queues notifications on supported state changes. `/api/jobs/notifications` requires the bearer secret, claims bounded batches and sends only when email delivery is enabled/configured. `vercel.json` schedules it hourly. Test with approved test recipients first; this work does not authorize sending to real applicants.
- Use verified Resend sending-domain DNS. Gmail is the support/reply inbox, not a substitute for an authenticated sending domain.

## 8. Acceptance checklist before opening registration

Use separate test client, administrator and two worker accounts on isolated services.

- [ ] Client registration, verification, login, logout and password recovery work.
- [ ] Wrong-role users cannot enter staff areas or call staff APIs.
- [ ] Admin account is explicitly provisioned; PIN success, failure, lockout and expiry work.
- [ ] Worker creation, first password replacement, assignment and deactivation work.
- [ ] Receipt upload, rejection/replacement and confirmation unlock the correct client only.
- [ ] Wizard saves/reloads all sections; optional sections do not overwrite each other; connection errors allow recovery.
- [ ] Package slots cannot exceed allowance; concurrent requests cannot create duplicates.
- [ ] Required documents/formats/size limits are enforced; unrelated users cannot download files.
- [ ] Malware quarantine/scanning and private-bucket access are verified.
- [ ] Review/submit checks payment, completeness, required documents and approved policy version.
- [ ] Staff review/status changes produce the correct client-visible updates without internal notes.
- [ ] Inbox, controlled email delivery, retry behavior and authorized print/export work.
- [ ] Mobile layouts, keyboard navigation and error messages are checked in signed-in areas.
- [ ] Exact deployed commit passes build and security tests, production variables are verified, restore procedure is rehearsed.
- [ ] Business has approved policies and assigned refund/privacy/retention responsibilities.

## 9. What is not finished

Full authenticated end-to-end verification is still required. Complete document-checklist editing/versioning, actor-attributed immutable auditing, automated retention deletion, malware scanning and optional external support/push/analytics integrations remain incomplete. No guide can guarantee a successful launch without these configuration and test results. This project must not be represented as fully verified merely because a build is green.
