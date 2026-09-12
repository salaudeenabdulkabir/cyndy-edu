# Cyndy Educational Pathways

Next.js application portal for clients, application staff and administrators. Authentication uses Clerk; application records use Neon PostgreSQL; documents use private Cloudflare R2 storage.

## Release status

Launch preparation is in progress. The application must not accept production applicants until the checks and account configuration in [READINESS.md](READINESS.md) and [LAUNCH.md](LAUNCH.md) are complete.

## Development

1. Use Node.js 22 or newer and run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure development services.
3. Run `npm run dev -- --hostname localhost --port 3000`.
4. Before submitting changes, run `npm run check:secrets`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

See [SETUP.md](SETUP.md) for service setup and credential handling. Production builds on Vercel run an additional environment check and fail closed when required production configuration is missing.

## Code layout

- `app/`: pages, role-specific dashboards and API handlers.
- `lib/`: authorization, input validation, storage and database code.
- `lib/db/migrations/`: baseline and reviewed incremental migrations.
- `tests/`: regression tests that do not write to external services.
- `scripts/`: production checks, secret scanning and local tooling.

The application imports `lib/db/schema.ts`. Root-level helper/schema copies and the `mnt/` directory in the original working folder are legacy references, not application entry points.
