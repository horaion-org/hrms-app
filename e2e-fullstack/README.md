# Full-stack e2e: Sign in and Session

Playwright drives the real app against the real API and a real Postgres. Only
Cognito is replaced. The mocked suite in `e2e/` (`pnpm test:e2e`) answers the
API at the network layer instead. It is unchanged and still runs on its own.

## Run it

```bash
pnpm test:e2e:fullstack                          # chromium and firefox
pnpm test:e2e:fullstack --project=chromium       # extra arguments go to Playwright
API_DIR=../e2e-api pnpm test:e2e:fullstack       # the API checkout is elsewhere
```

You need Docker, `curl`, Node, the app's dependencies (`pnpm install`) and an
API checkout that contains the e2e launcher (`src/test/java/com/horaion/e2e/`).
Maven fetches anything it is missing on the first run. To run Maven offline,
set `MAVEN_ARGS=-o`.

`API_DIR` defaults to `../api`, relative to this repository's root. **If you
use git worktrees**, `../api` is usually not the API checkout you want. Point
`API_DIR` at the API worktree instead, for example `API_DIR=../e2e-api`.

One command, `e2e-fullstack/run.sh`, does all of this:

1. **Starts a throwaway Postgres.** It uses `postgres:17-alpine` with its data
   in memory, bound to `127.0.0.1`, and a unique container name labelled
   `horaion.e2e=fullstack`. The API's `scripts/db-init` creates the runtime
   role (ADR-0025).
2. **Starts the API.** It runs `./mvnw spring-boot:test-run` in `API_DIR` with
   the launcher `com.horaion.e2e.E2eApplication` and the `e2e` profile. Flyway
   migrates the database as the owner, and the API serves as the runtime role.
   The API gets a clean environment and a scratch working directory. Your
   shell's `SPRING_*` or `POSTGRES_*` variables and your `.env` files are never
   read.
3. **Builds the app and serves it.** It runs `vite build` with
   `VITE_API_BASE_URL` pointing at that API, then `vite preview`.
4. **Runs Playwright** with `playwright.fullstack.config.ts`.
5. **Stops everything and removes the container** on every exit: success,
   failure or Ctrl-C.

Logs from the last run are in `test-results/fullstack-stack/`: `api.log`,
`app.log` and `build.log`. Playwright's artifacts are in
`test-results/fullstack/`. The HTML report is in `playwright-report/fullstack/`.

If you had to `kill -9` a run, remove its container like this:

```bash
docker rm -f -v $(docker ps -aq --filter label=horaion.e2e=fullstack)
```

## Ports

All three listen on loopback only.

| What | Default | Override |
| --- | --- | --- |
| Postgres | `127.0.0.1:55432` | `E2E_DB_PORT` |
| API | `127.0.0.1:18080` | `E2E_API_PORT` |
| App (`vite preview`) | `127.0.0.1:15173` | `E2E_APP_PORT` |

The browser uses `http://localhost:<port>` for both the app and the API. They
are then the same site, which the `SameSite=Strict` Session cookie needs. The
script stops with a message if a port is already taken. `E2E_STARTUP_TIMEOUT`
(default 300 seconds) bounds each wait. `E2E_POSTGRES_IMAGE` overrides the
Postgres image.

## What is faked, and why

Cognito is the only thing replaced, because it cannot run locally and it sends
real email. On the API's test classpath, the e2e launcher does four things:

- **Replaces the identity port** with `InMemoryIdentityProvider`, the same fake
  the API's controller tests use. Onboarding, email confirmation, sign-in,
  Challenges, refresh, sign-out and TOTP behave the way the Cognito adapter
  does through the port.
- **Mints real access tokens.** The tokens are RS256 JWTs signed with a key
  pair generated at startup. They carry `sub`, the configured `iss` and
  `client_id`, `token_use=access`, the Cognito admin scope, and `iat`/`exp`.
- **Verifies them with the production validator chain.** The API's
  `JwtDecoder` checks them with that public key and
  `SecurityConfiguration.accessTokenValidator`, so every request goes through
  the real resource server. The cookie handling, the Origin checks, the rate
  limiter and the database are all the production code.
- **Serves a helper route for emailed codes.** `POST
  /internal/e2e/confirmation-code-lookups` with `{"email": ...}` returns the
  confirmation code the fake "emailed". It exists only in the launcher, only
  on `127.0.0.1`, and refuses non-loopback callers. The authenticator code is
  the fake's constant `123456`.

None of this is in the API's jar. It lives under `src/test`, outside the
component-scan root.

The e2e profile raises the rate limits so repeated runs never answer 429. It
also allows the app's origin for CORS and the Session routes. Redis and OPA are
not started, because the suite only uses public routes, `/api/v1/me` and
`/api/v1/me/mfa`.

## Browsers

- **Chromium and Firefox** pass.
- **WebKit fails, as expected.** It receives the `Set-Cookie` for
  `__Secure-horaion_rt`, but it does not store a `Secure` cookie from
  `http://localhost`. Every renewal then answers 401, so the Session does not
  survive a reload. This is why the script runs Chromium and Firefox unless you
  pass `--project`. Covering WebKit would need the stack served over HTTPS.

The suite runs a production build rather than the dev server, for two
reasons:

- The dev server's HMR client reloads the page when its socket drops during a
  navigation, which makes Firefox abort `page.goto`.
- The dev server's devtools keep state in `localStorage`, which the
  web-storage assertions would have to allow for.
