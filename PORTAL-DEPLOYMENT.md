# Full portal deployment plan

## Current status

The public information site is live at https://cyndy-educational-pathways.pages.dev/ . The main Next.js app now uses the same landing design, with links to its sign-in/sign-up routes and the existing role-specific dashboards. This app has not been deployed to Cloudflare.

Applicant, administrator and worker portals are one application, not three separate deployments. Authorization must remain enforced by the server, not just hidden navigation.

## Zero-budget feasibility comes first

Cloudflare Pages Direct Upload serves the public static files only. The Next.js app needs a server runtime, such as Cloudflare Workers with a compatible adapter. Evaluate OpenNext against Next.js 15 in a separate preview before changing the live site.

Workers Free currently allows 10 ms CPU per HTTP request. This app uses bcrypt cost 12 for administrator PIN checks. A local synthetic comparison took approximately 689 ms on 19 September 2026. This is not a measurement of Cloudflare CPU, but is a strong feasibility concern. Do not weaken the hash or remove the administrator verification gate to fit a free plan. Measure the actual Worker, including sign-in, imports, exports and uploads. A free-tier-compatible design may require managed step-up authentication and less server rendering.

The current Clerk production setup also requires a controlled domain. If the budget cannot cover a domain, evaluate a managed authentication provider supporting its own hosted auth domain before migration. Account IDs, database user links, role checks, webhooks and session revocation must be migrated and tested together. Do not launch using development keys as a substitute for production authentication.

## Release sequence

1. Prove hosting and authentication can meet the zero-budget requirement; identify exact service limits and any account requirements before requesting new sign-ups.
2. Build and test the complete app on the chosen runtime with an isolated database and test document storage. Keep the current public site available.
3. Configure secrets in the host's encrypted secret/environment settings, not source code. Required integrations include database, authentication and webhook signing, Redis rate limits, private document storage, email delivery and scheduled notifications. The existing Vercel cron configuration will not configure Cloudflare; implement an authenticated scheduled handler for the chosen host.
4. Rehearse database migration and rollback, rotate previously exposed credentials and verify production configuration. Prior migration approval covered the isolated branch only.
5. Test applicant registration, draft saving, package access, upload/download, submission, worker assignment/restricted access, administrator sign-in/step-up, status updates and logout. Include denied cross-account access and mobile layouts.
6. Finalize policy approval, document retention operations and document security. Keep submission disabled until the required launch checks pass.
7. Deploy the verified version, run production smoke checks, and then connect the public site's application links. Record release and rollback instructions.

## Sources

- https://developers.cloudflare.com/workers/platform/limits/
- https://opennext.js.org/cloudflare/get-started
- https://clerk.com/docs/guides/development/managing-environments

See README.md for the screen/role/integration inventory and LAUNCH.md for the existing release checklist. This plan updates the hosting approach; it is not evidence that the full portal is ready for public applications.
