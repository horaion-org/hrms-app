# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Workspace context (read first)

@../context.md

Before any implementation or change request, follow `../context.md`: build context from both
`../api/repomix-output.xml` and `../app/repomix-output.xml`, then confirm against the live files. After the
implementation is complete, run `npx repomix@latest` at the root of each repository you changed.

## Components are first-class citizens

React components are the primary unit of work in this codebase. UI is assembled
from named, reusable, independently testable components — never from ad-hoc JSX
written inline at the call site.

### Required workflow for any task that touches UI

**1. Search before you write.**

Before producing a single line of JSX, search for an existing component that
already does the job. Search by concept, not just by exact name — a "status
badge" may already exist as `Badge`, `Chip`, `Tag`, or `Pill`.

```bash
# by name/concept
rg -il '<concept>' src/components src/features src/pages
# by directory
find src/components -type d -maxdepth 3
```

Cover all of `src/components/{ui,forms,layout,charts}`, plus `src/features/*`
for a component that may exist but has not been promoted to shared yet.

**2. If it exists — reuse it.** Extend its props if the new case needs it.
Do not clone, fork, or re-implement a near-duplicate.

**3. If it does not exist — stop and ask.**

Do not silently create the component, and do not work around its absence with
inline JSX. Pause the task and ask, reporting:

- what you searched for and where
- the nearest existing component, if any
- the exact component and path you propose creating
- the files that come with it

Then wait for an answer before continuing. Example:

```text
No existing component matches "status badge".
Searched: src/components/{ui,forms,layout,charts}, src/features/*
Nearest: none

Create src/components/ui/Badge/ first?
  Badge.tsx  Badge.stories.tsx  Badge.test.tsx  index.ts
```

This gate applies even when creating the component looks obvious or trivial.
The point is that component inventory is a decision the human owns.

## Where components go

| Directory                | Holds                                                      |
| ------------------------ | ---------------------------------------------------------- |
| `src/components/ui`      | Generic UI primitives — buttons, badges, modals, inputs     |
| `src/components/forms`   | Form controls and form-specific composites                  |
| `src/components/layout`  | Layout scaffolding — sidebars, headers, shells              |
| `src/components/charts`  | Reusable charts, split into `bar/`, `line/`, `pie/`         |
| `src/components/utils`   | Non-visual helper components (e.g. devtools wrappers)       |
| `src/features/<feature>` | Components bound to one feature and not reused elsewhere    |
| `src/pages`              | Page-level composition only — no primitives defined here    |

Each directory's `README.md` is authoritative for its own conventions; read it
before adding to that directory.

## Component file conventions

One component per folder, named for the component, with a full file set:

```text
src/components/ui/Badge/
  Badge.tsx          # the component
  Badge.stories.tsx  # Storybook story
  Badge.test.tsx     # Testing Library unit test
  index.ts           # re-export; all imports go through this
```

- Named exports, not default exports.
- Return type is `FunctionComponent` from `@/common/types`.
- Import via the `@/` alias (`@/components/ui/Badge`), never deep relative paths.
- Compose subcomponents as nested folders following the same quad (see
  `src/components/layout/README.md`).
- A component promoted from `src/features/*` to `src/components/*` gets the
  stories and test files at promotion time.

## Stack

Vite · React 19 · TypeScript (strict) · TanStack Router/Query/Table · React Hook
Form + Zod · Zustand · Tailwind 4 · i18next · Nivo · Storybook · Vitest +
Testing Library · Playwright.

Routes are file-based under `src/routes`; `src/routeTree.gen.ts` is generated —
never edit it by hand.

## Checks

```bash
pnpm lint          # eslint, zero warnings tolerated
pnpm test:unit     # vitest
pnpm test:e2e      # playwright
pnpm build         # tsc + vite build
```

Run `pnpm lint` and `pnpm test:unit` after changing components.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Security, Data Protection And Compliance

Security, data protection and auditability are first-class requirements for every change. The app targets ISO 27001:2022 and SOC 2 Type II as one programme with `hrms-backend-v2`, `engine` and `horaion-infra`. The canonical, audit-facing statement of these rules is `docs/security/secure-development-policy.md`: cite that document (never this file) in ADRs and security docs, and keep the two in sync when either changes.

- **Security Considerations everywhere.** Every spec under `.scratch/` and every PR description has a Security Considerations paragraph: the data shown or entered and its class (`docs/security/data-classification.md`), the permission keys that gate it, anything kept in the browser, and the abuse case considered.
- **ADRs for security-relevant decisions.** Session or token handling, browser storage, response headers or CSP, new third-party scripts, fonts or services, and telemetry get an ADR in `docs/adr/` in the same PR.
- **The API is the access control.** Hiding a control is presentation only. Gate UI on the permission contract (`pnpm check:contract`), and never treat client-side state as proof of access.
- **Sessions follow ADR-0004.** The access pass lives in memory only; the session is the API's HttpOnly cookie. Never put tokens, passwords, email addresses or other personal data in `localStorage`, `sessionStorage`, IndexedDB, URLs or query strings. Every browser-storage key is listed in `docs/security/frontend-security.md`.
- **No personal data in logs or telemetry.** Never log API payloads or form values to the console in committed code. No analytics, error-reporting or session-replay SDK without an ADR and an entry in `docs/security/vendors.md`.
- **Content Security Policy.** No inline scripts, `eval`, `dangerouslySetInnerHTML`, or third-party script, style or font origins. The app must run under the CSP and headers recorded in `docs/security/frontend-security.md`.
- **Dependencies** are added only with a justification in the PR body and the `pnpm-lock.yaml` update in the same PR. Reject packages with known high or critical advisories or without maintenance.
- **Keep `docs/security/` complete.** The `docs/security/` set must stay complete as listed in `docs/security/README.md`. Register every new security document or runbook in that README and in `docs/security/controls-matrix.md` in the same PR.
- **Suggest missing controls; do not stay silent.** If a standard control is absent but relevant to the change, flag it in the spec or PR with a short rationale and a proposed approach, and let Moses decide. Known gaps to keep flagging until resolved: no CI runs on pull requests; no CSP or security headers are configured for the deployed app; both `package-lock.json` and `pnpm-lock.yaml` are committed; the language detector caches a locale in `localStorage` (ADR-0004). The full list is `docs/security/accepted-risks.md`.
