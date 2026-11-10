# Horaion

Horaion brings people, scheduling, leave, and organisation management together.

Interface copy follows the capitalization standard in [CONTEXT.md](CONTEXT.md#interface-copy).

## Development

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173. `/` is the guarded home page; Log in is at `/login` and Onboarding is at `/register`.

## Authentication

Log in uses email and password on Horaion's own screens, through the API's backend-for-frontend. A temporary password leads to a new-password Challenge at `/new-password`; an authenticator Challenge uses `/mfa`. Challenges can follow one another, but reloading a pending Challenge returns to Log in. `/sign-in` and `/sign-up` redirect to `/login` and `/register`.

Onboarding leads to Email confirmation at `/confirm-email`, where a person enters or requests an emailed code. Confirmation returns to Log in with the email filled in. Password reset at `/forgot-password` requests a code, then accepts the code and a new password; successful completion asks the API to end Sessions on every device and returns to Log in. Emails travel between screens in tab-scoped history state, never in URLs or web storage. Direct visits allow the email to be entered.

The API's Session lasts seven days, with no "Remember me" option. Its HttpOnly cookie keeps reloads and new tabs logged in; the app holds the access pass in memory and renews silently. An expired Session returns to Log in with a checked local return path. An unreachable API during guarded loading shows a retry screen. Log out clears the app's Session and query cache in every open tab; successful API revocation ends this device's Session, leaving other devices logged in.

Home shows the Current Company: the last chosen Company if still usable, otherwise the only usable one, otherwise a choice. "Switch company" appears when several are usable. Removed access re-settles this choice without ending the Session; no remaining access shows an explanation and Log out. Authentication stores only the last chosen Company id in `localStorage`, never a credential. The existing language detector separately caches the locale there.

The app calls these routes with camelCase JSON:

| API route | Purpose |
| --- | --- |
| `POST /api/v1/public/onboardings` | Onboarding |
| `POST /api/v1/public/sessions` | Log in |
| `POST /api/v1/public/sessions/challenge` | Answer a Challenge |
| `POST /api/v1/public/sessions/refreshes` | Renew the access pass |
| `DELETE /api/v1/public/sessions` | Log out |
| `POST /api/v1/public/sign-up-confirmations` | Confirm email |
| `POST /api/v1/public/sign-up-confirmation-codes` | Request another confirmation code |
| `POST /api/v1/public/password-resets` | Request or resend a reset code |
| `POST /api/v1/public/password-resets/completions` | Set the new password |
| `GET /api/v1/me` | Load the person and Company memberships |

Session routes send credentials and JSON bodies, including `{}` for renewal and Log out; `/me` uses a bearer pass. Onboarding combines first and last names into `displayName` and sends `companyName`, `subdomain`, `email` and `password`. The form still collects a Registration number but omits it from the request; this is tracked in Onboarding issue 01.

Run the API on port 8080 for local development; Vite proxies `/api` there. Override the proxy with `API_PROXY_TARGET` if needed. The API's `CORS_ALLOWED_ORIGINS` must include the dev origin, normally `http://localhost:5173`, even through the proxy. WebKit may refuse `__Secure-` cookies on `http://localhost`; use Chromium or Firefox for manual Session testing. Deployments should proxy `/api` to the API, or set public `VITE_API_BASE_URL` at build time and configure API CORS accordingly, including exposing `Retry-After`. The app and API must share a registrable domain for `SameSite=Strict` cookies. Never put secrets in `VITE_` variables.

The decision is recorded in [app ADR 0004](docs/adr/0004-sessions-through-the-api-bff.md).

## Checks

```sh
pnpm lint
pnpm exec vitest run src/
pnpm test:e2e
pnpm build
```

CI (`.github/workflows/ci.yml`) runs on every pull request to `development` and every push to it. It has two
jobs:

- **Type check & lint:** `pnpm exec tsc`, then `pnpm lint` (the permission contract check, then eslint).
- **Unit tests:** `vitest run src/` in three shards, with one worker per core and a 15 s per-test timeout. The
  5 s default is too tight on a shared runner.

Both jobs run on Blacksmith runners (backend ADR-0070); setting the repository variable `CI_RUNNER` to
`ubuntu-latest` moves them back to GitHub. A change that touches only Markdown, `docs/` or `.scratch/` runs no CI.

The Playwright suites are not run on pull requests. `.github/workflows/playwright-nightly.yml` runs the mocked browser
suite in all three browsers every week (and on demand from the Actions tab) and uploads the HTML report as an
artifact. To reproduce a CI shard locally:

```sh
pnpm exec vitest run src/ --shard=1/3 --testTimeout=15000
```

**The quarantine.** A test that fails on `development` and cannot be fixed at once is marked `it.skip` and listed
in `test-quarantine.json` with its reason. `pnpm lint` runs `check:quarantine`, which fails when a skipped test is
not listed, a listed test is not skipped, an entry has no reason, or a test file holds a `.only`. CI writes the list
to each run's job summary. Quarantine single tests, never whole files, and remove the entry and the `.skip` once the
test passes.

The browser suite mocks the API at the network boundary with Playwright's `context.route` and `page.route`. `e2e/session.ts` models a shared Session across pages and returns access passes from Log in and refresh, clears it on Log out, and supplies `/me`; individual specs mock Onboarding, confirmation, Challenges, reset and failures. Tests check reloads, two-tab Log out, Company switching, and the absence of credentials in web storage and emails in URLs. They use no real accounts or Session cookies, so they do not test cookie acceptance or API revocation. The pre-existing Onboarding issue 01 test still expects the omitted Registration number. Shared UI components can be explored using `pnpm storybook`.
