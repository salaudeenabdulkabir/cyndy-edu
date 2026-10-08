# GitHub source and deployment workflow

GitHub repository: https://github.com/salaudeenabdulkabir/cyndy-edu

`origin` is the primary Git remote. GitLab (`gitlab`) is retained as a historical backup while the migration is verified. GitHub `main` contains the earlier staging baseline (`930503c` at migration); `codex/portal-opportunity-redesign` contains the online test portal (`09c65b9` at migration). The redesign must stay on its branch until the launch gates in [QA-REPORT-2026-10-03.md](QA-REPORT-2026-10-03.md) are cleared. Do not force-push either branch.

## Day-to-day changes

1. Fetch `origin` and confirm your branch and working-tree status. Keep unrelated local/untracked files out of commits.
2. Make the change on the redesign branch, run the checks relevant to it, and run `npm run check:secrets`.
3. Commit and push to `origin`. GitHub Actions runs `npm ci`, secret scanning, tests, lint, build, typecheck and a production-dependency audit with dummy build values.
4. Review the GitHub pull request and its checks. Render automatically deploys the same branch. Compare its live commit SHA with GitHub before testing.
5. Merge to `main` only after the documented applicant/admin/worker acceptance and public-launch requirements are complete. Merging code does not migrate a production database or copy Render environment variables.

## Render connection status

The existing free Render service is at https://cyndy-edu-staging.onrender.com/ and builds from GitHub branch `codex/portal-opportunity-redesign`. The source switch was verified by a live GitHub commit on 8 October 2026. Its test Clerk keys, isolated Neon database and private R2 test bucket remain in Render Environment settings. Do not publish the test application as a real payment flow.

For each release, confirm a GitHub commit is shown as **Live** under Render **Deploys**, then load the applicant portal. The current deployment source is shown under **Settings → Build → Source**.
