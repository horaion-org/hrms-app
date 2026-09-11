# The app is a static build hosted on Vercel
Date: 2026-09-11 · Status: Accepted

The client is a single-page app: after `pnpm build` it is a folder of HTML, JavaScript, CSS and
translation files with no server-side code. What runs in production is therefore a file server, and the
decision is who operates it, what it contains, and how it is configured.

Decided: Vercel builds and hosts the app from the GitHub repository. On every push Vercel runs the
frozen-lockfile install and `pnpm build` and serves `dist/` from its CDN, with TLS, compression and
edge caching handled by the platform. The `main` branch is production; every other branch, including
`development`, gets a preview deployment, which is the review environment for a PR. The `VITE_*` values
are environment variables set in the Vercel project, per environment, because Vite bakes them into the
bundle at build time; they are public identifiers by design. Node and pnpm versions come from
`engines` and `packageManager` in `package.json`, so Vercel builds with the same tools as CI.

`vercel.json` holds the deployment configuration that belongs in the repository: every unknown path is
rewritten to `index.html` after the filesystem is checked, so client-side routes deep-link; hashed
assets under `/assets/` are cached for a year as immutable; `index.html` is never cached, so a deploy
is visible on the next load. Security headers are added to the same file by their own ADR, so that
each Content-Security-Policy exception is argued on its own.

The previous Dockerfile copied the whole working directory, `.env` and `node_modules` included, into
a root nginx image with the stock configuration. It is removed rather than fixed: an unused deployment
path that ships local configuration is worse than none, and one deployment model keeps headers and
rewrites in a single place that cannot drift.

We rejected a container beside the API under its compose topology. It would give full control of the
web server and keep the app off a third party, at the cost of operating TLS, caching and a web server
ourselves for a static folder. If the app ever needs that, this ADR is superseded and the container
build returns with its own record. We rejected running both models for the drift reason above.

Consequences: Vercel enters the vendor register and the asset inventory. Preview deployments must
require authentication in the project settings so unreleased work is never public. Deployment
protection, domains and environment variables live in the Vercel dashboard, outside git, and the
access review covers who can change them.
