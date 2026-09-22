# Render test deployment

Service: `cyndy-edu-staging` (Free, Virginia).

URL: https://cyndy-edu-staging.onrender.com

Dashboard: https://dashboard.render.com/web/srv-daol403bc2fs73ef6fig

Source: GitLab `voltage-group1/cyndy-edu`, branch `main`. The public information site remains on Cloudflare Pages and is a separate deployment.

## Build configuration

- Node version: 22
- Build: `npm ci --include=dev && npm run build`
- Start: `npm run start -- --hostname 0.0.0.0 --port $PORT`
- Port: 10000

The explicit `--include=dev` is required because Tailwind, TypeScript and other build tools are dev dependencies, even though the deployed server runs with `NODE_ENV=production`.

Origin protection uses Render's automatic `RENDER_EXTERNAL_URL` and an optional `NEXT_PUBLIC_APP_URL` custom domain. This avoids comparing the browser's HTTPS address with an internal proxy address. Set `NEXT_PUBLIC_APP_URL` to the correct public URL when adding a custom domain; never use a wildcard or disable the origin check to fix a login error.

## Environment and scope

The user approved copying only the Clerk development key pair, isolated staging database connection, administrator PIN hash and Redis credentials into Render. Values are kept in Render's Environment settings, never this guide. Clerk route settings and the public support email are also configured. No production database migration is part of this deployment.

Email notifications are disabled. Legal-policy approval is false, so application submission remains blocked. R2 staging credentials are configured in Render for the private test bucket. Clerk webhook delivery is not configured for this service yet.

On 22 September, the private R2 bucket `cyndy-edu-staging-documents` was created with public access disabled. The user updated the staging key to permit uploads. A harmless test object uploaded successfully; a signed download returned HTTP 200 with matching content, while unsigned access was denied. Render uses the approved staging key under `CLOUDFLARE_R2_ACCESS_KEY_ID` and `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, the existing account ID, and `CLOUDFLARE_R2_BUCKET_NAME=cyndy-edu-staging-documents`. Local production storage settings were not overwritten. The S3 client uses the account endpoint with path-style bucket addressing to avoid bucket-hostname DNS failures.

Countries & Programs now offers 249 countries and territories without manual entry. A country record is created only when its first school is added. Existing country and school records remain intact. Delete a school's unused programs before deleting the school; programs linked to applications and schools linked to course requests are protected. Use Hide or Close intake for those records. Worker creation errors now appear on the Workers tab, with guidance for duplicate emails, password rejection and usernames required by Clerk.

The Render project may label its default environment "Production"; this service is still a test deployment using development authentication and an isolated database. Use dummy applicant information only. Its URL is internet-accessible, not a private network. Authenticated portal routes retain application access controls.

## Testing

Verified on 21 September 2026: Render successfully built and deployed commit `8563939495770b164ae558b42887a0c426f5ba42`. The homepage and Clerk sign-in form render online. `/api/health` returns HTTP 200 with `{"status":"ok"}`. Signed-out requests to `/api/admin/clients`, `/api/worker/applications`, and `/api/applications` return HTTP 401; `/admin`, `/worker`, and `/apply` redirect to the homepage. These checks do not establish that authenticated workflows or external integrations work end to end.

1. Open the homepage, then sign in with a Clerk development account.
2. Administrator entry: `/admin/login`. Clerk and database roles must both match; the private administrator PIN is still required.
3. Worker entry: `/worker/login`. A matching test worker account must be provisioned before worker workflows can be verified.
4. Applicant entry: `/sign-up`, then `/apply`. Use dummy details. Administrative package/payment setup may be required for editing.
5. Verify draft saving and account isolation. Complete storage, webhook and submission configuration before claiming full workflow coverage.

Free services sleep after inactivity; a slow first visit can be a cold start. A successful `/api/health` response verifies the web process only, not the database, login, Redis or storage integrations.

## Corrections and redeployments

To manage API keys later, open the Render dashboard link above, choose **Environment**, then edit the relevant variable and save/redeploy. Use separate test credentials here. Never add secret values to source files, GitLab, screenshots, or this guide. Only variables intended for the browser may use the `NEXT_PUBLIC_` prefix.

Edit and verify locally, then commit and push to GitLab. Inspect the Render Deploys page for the exact commit and successful build before testing. Do not put `.env.local` into Git or enable production services simply to make a staging test pass.


Storage verification: Render deployed `db65780` successfully. The applicant portal accepted `cyndy-staging-upload-test.pdf` (clearly marked STAGING TEST, not a real receipt) into the empty Receipt document slot for application 2026-003, showing 1 of 1 uploaded and Pending review. This is a dummy document, not evidence of payment; replace it with a genuine document before any real processing.

Test submissions: STAGING_SUBMISSIONS_ENABLED=true enables practice submissions only on the exact Render staging URL, with Clerk test keys and email disabled. LEGAL_POLICIES_APPROVED remains false. Records receive testSubmission=true and a staging-test policy version; this does not approve public launch terms.
