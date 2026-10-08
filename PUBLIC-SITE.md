# Free public website

The `public-site/` directory is a standalone static information site for Cyndy Educational Pathways. It contains the home page, contact page, website privacy notice, 404 page, stylesheet and Cloudflare security headers.

This release does not include sign-in, applications, payments, document uploads or admin/worker access. The original Next.js portal remains in `app/` and still needs its production setup and authenticated verification described in `LAUNCH.md`. Do not deploy the entire repository as static files.

## Cloudflare Pages

Project name: `cyndy-educational-pathways`.

Live URL: https://cyndy-educational-pathways.pages.dev/

Published 19 September 2026. Verified the live homepage returns HTTP 200 over HTTPS with the configured CSP, anti-framing, MIME-sniffing and permissions headers. Desktop and 375 px mobile homepage layouts were checked locally, with no horizontal overflow. This verification covers the public site only.

This uses Pages Direct Upload with no build step, server, database or environment variables. No paid plan is needed for this static deployment. Keep API keys and populated `.env` files out of this directory.

To update it:

1. Edit files under `public-site/` and check the home/contact pages on desktop and mobile.
2. Zip the **contents** of `public-site/`, with `index.html` at the archive root.
3. In Cloudflare, open Workers & Pages → `cyndy-educational-pathways` → Create a new deployment.
4. Upload the zip and deploy, then verify the public pages and contact link.
5. Commit the source changes to GitHub. Direct Upload does not automatically deploy GitHub commits. It can later be automated with Wrangler/CI; switching this project to native Git integration requires a new Pages project.

The support address is `cyndyeducationalpathways7@gmail.com`. The contact link opens the visitor's email application; it is not an online form and does not send a message automatically.

No analytics, advertising scripts or cookies are added by this source. Cloudflare can still process request metadata to host and protect the site.
