# Real end-to-end suite

Browser and API flows against a live, isolated stack: real backend, OPA, scheduling engine and Cognito (dev pool).
Nothing is mocked. The mocked suite in `e2e/` is separate; `playwright.config.ts` ignores this folder.

**Not in CI.** This suite needs a running backend, OPA, engine, Postgres and Cognito accounts, so no workflow runs it.
Run it locally before a release or after a wave of merges, as below.

## Stack

The suite expects an isolated stack that is already running; it never starts a server. Use separate ports and a
throwaway database, never the dev ones:

| Part | Default | Override |
|---|---|---|
| App | vite on 5190, proxying `/api` to the backend | `E2E_APP_URL` |
| Backend | any free port (8090 in the 2026-11-09 run), with OPA, the scheduling engine (local dispatch) and Cognito management on; the app's vite proxies `/api` to it (`API_PROXY_TARGET`) | – |
| Database | `horaion_e2e` in container `horaion-postgres`, user `vernon` | `E2E_DATABASE`, `E2E_POSTGRES_CONTAINER`, `E2E_POSTGRES_USER` |

The seed expects an empty database, so recreate it before each full run.

Backend settings some cases rely on:

| Setting | Value | Why |
|---|---|---|
| `MEMBER_IMPORT_SEND_INVITATIONS` | `false` | Imports create people without emailing them |
| `MEMBER_IMPORT_INVITATIONS_PER_DAY` | `3` | E2E-016 sends 2 invitations and E2E-017 is refused over the limit |
| `APP_APPROVALS_STALLCHECKCRON` | `*/20 * * * * *` | E2E-146 waits up to 75 s for the stalled-step notice (default sweep: every 5 min) |
| `ENGINE_POLL_INTERVAL` | `5s` | Generation results land within a case |
| `STARTING_CONTEXT_SEND_REST_DAYS` | `true` | Generations send rest days (carry-over and the terms' fixed rest day); the engine on `development` accepts them (engine#68) |
| Redis cache, rate limit | off | No shared state between runs |

E2E-016 sends two real invitation emails (to `e2e+` addresses); everything else sends none. E2E-164 reads the
backend log (`E2E_BACKEND_LOG`, default `run/backend.log` in the run folder).

## Run folder

Everything outside the repo lives in one run folder (`E2E_RUN_DIR`, default the git-ignored `test-results/e2e-real`):

| File | Written by | Holds |
|---|---|---|
| `run/accounts.env` | you | `E2E_PASSWORD` and `E2E_<ROLE>_EMAIL` for admin, manager, manager2, editor, hr, approver, worker, ownerB |
| `run/routes.json` | `python3 -I e2e/real/tools/extract_routes.py <backend checkout> <run dir>/run/routes.json` | Every backend route and its guard |
| `run/permission-catalog.json` | you: a copy of the backend's `contracts/permission-catalog.json` | The permission keys |
| `run/seed.json`, `run/storage/` | `seed`, `sign-in` | Seeded ids, one browser state per user type |
| `run/cognito-created.txt` | the specs | Identities the run created in the Cognito pool, for deletion |
| `screens/` | the specs | `<case>-<step>.png` |

The accounts are pre-made Cognito users (`e2e+<role>@…`). Company A has the seven company roles: manager runs
Operations, manager2 runs Support, editor edits Operations' roster without leave keys, hr holds the leave and
terms keys, approver decides Operations' publications, and worker has no role. ownerB owns company B. The seed
onboards company A with a throwaway owner and moves the users rows onto these accounts.

## Run

```bash
export E2E_RUN_DIR=<run dir>
pnpm exec playwright test --config playwright.real.config.ts --project seed --project sign-in
E2E_RESULTS_FILE=<run dir>/run/results.json \
  pnpm exec playwright test --config playwright.real.config.ts --project flows --no-deps
```

- Two steps, because every spec reads `run/seed.json` when it loads, before the seed could write it.
- `seed` builds both companies and writes `run/seed.json`; `sign-in` signs each user type in through `/login` and
  saves its browser state; `flows` runs the numbered specs in order on one worker, since later flows build on
  earlier state.
- Use a fresh database for a full run: the leave and cover-offer cases book days that a second run on the same
  database would find taken.
- Each case records what it saw as `actual` and `screen` annotations in the JSON results.
- Files are serial, so one failing case skips the rest of its file. A check that is expected to show a known gap
  records what it saw and is judged by a case at the end of the file (or in `77-approvals-gaps`), never mid-flow.

## Layout

| File | Covers |
|---|---|
| `seed.setup.ts`, `sign-in.setup.ts` | Data for both companies, one browser state per user type |
| `10`–`80` specs | The merged flows: settings, import, generate, schedule page and edits, publish, leave, cover offers, approvals, hours ledger |
| `22-import-follow-ups.spec.ts` | Employee code and Employment terms columns, email correction, Invite everyone and its daily limit, the Signed in filter |
| `65-leave-small.spec.ts` | "Needs cover" with leave ignored, leave notice remarks, past-leave comment, Withdraw publication, no regeneration after |
| `72-cover-offers-ui.spec.ts` | Send offer / They agreed in the cell panel, racing offers, Offers out in Issues, the member's card, both inboxes |
| `76-approvals-ui.spec.ts` | Settings › Approvals, submit / approve / reject / withdraw on the roster, P3 (cancel on edit, one approver on two steps, distinct approvers and the stall notice, leave flows), Needs review |
| `77-approvals-gaps.spec.ts` | Judges gaps 76 records (`run/approvals-seen.json`), one case each and not serial, so one gap never skips another |
| `85-spanish.spec.ts` | Spanish walk-through |
| `88-user-types.spec.ts` | Navigation, key screens and inboxes per user type |
| `90-permission-matrix.spec.ts` | Every company and `/me` route × every user type; expected outcomes come from the route guards (`run/routes.json`) |
| `95-isolation.spec.ts` | No data crosses between company A and company B |
| `99-regression.spec.ts` | Re-checks of earlier defects no flow case covers (D-01, D-05, D-07–D-10 of the 2026-11-08 report) |
| `support/` | API client, database reads, seed data, roster, schedule and notification helpers, the matrix model, UI helpers |
| `tools/extract_routes.py` | Reads the backend controllers into `run/routes.json` |
