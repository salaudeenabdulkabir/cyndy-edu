# Cyndy Educational Pathways — setup

Use Node.js 22 or newer. Run `npm ci`, copy `.env.example` to `.env.local`, and fill the blank values using each service dashboard. Never commit a populated environment file.

## Local verification

1. Run `npm run check:secrets`.
2. Run `npm test`, `npm run typecheck`, and `npm run lint`.
3. Run `npm run build`.
4. Run `npm run dev -- --hostname localhost --port 3000`.
5. Run `npm run check:production` before deploying production. Missing values must be resolved, not bypassed.

## Accounts and production

- Vercel: use an eligible commercial plan. Hobby is restricted to personal/non-commercial use.
- Domain: Clerk production requires a domain you own. A `.vercel.app` address is suitable for development previews with test accounts.
- Clerk: create the production instance, verify DNS, configure email/password login and required profile fields. Add the verified webhook endpoint `/api/webhooks/clerk` for user.created, user.updated, and user.deleted. Put its signing secret in CLERK_WEBHOOK_SECRET.
- Neon: keep preview and production databases separate. Review migrations in `lib/db/migrations`. Do not run the baseline creation migration against an existing schema. See LAUNCH.md for the existing-database procedure.
- Redis: configure both REST URL and token. Admin PIN sessions and upload limiting deny access when Redis is unavailable.
- Admin PIN: choose a new private six-digit PIN; store only a bcrypt hash with cost 12 or higher. The old public/default PIN must not be reused.
- R2: rotate exposed credentials, use a private bucket, disable r2.dev public access and public custom domains, then test uploads and signed downloads. The request upload limit is 4 MB.
- Resend: verify a sending domain before sending to applicants. Use a monitored support inbox for replies.

## Credential rotation

An earlier environment template contained credential-like values for Clerk, Neon, Cloudflare R2, Resend and UploadThing. They were removed from publishable files. Rotate those values through their service dashboards before launch; removing a value from a file does not revoke it.

Read READINESS.md and LAUNCH.md for evidence, remaining requirements and the release checklist.
